import * as llm from '../llm';
import type { ParsedFile, DetectedTool, ToolParameter } from '../../sidepanel/lib/types';

const IMAGE_PROMPT = `Analyze this image of a business process/workflow.
Extract ALL text, steps, rules, and structure visible.
If it's a flowchart/diagram, describe every node and connection.
If it contains Vietnamese, keep Vietnamese.
Mark unclear parts with [unclear].
Return structured text, not JSON.`;

const SUMMARIZE_PROMPT = `You are a technical analyst. The following is a large document describing a business workflow, agent, or system.
Extract and preserve ALL of the following — do not omit any:
1. Every distinct action/tool the system performs (name, what it does, inputs, outputs)
2. Every workflow step or skill described
3. Input parameters and their types
4. Business rules, conditions, constraints
5. Error handling

If the document is in Vietnamese, keep Vietnamese.
Return structured plain text. Be dense but complete — this summary will be the sole input for downstream analysis.`;

const EXPAND_PROMPT = `You are a technical writer helping convert a short user request into a detailed workflow specification.

The user provided a very short description of what they want to build (a tool, skill, or agent capability).
Expand it into a complete workflow document with:
1. Purpose & overview (2-3 sentences)
2. Input parameters the tool/skill accepts (name, type, description, required/optional)
3. Step-by-step execution flow (what happens internally)
4. Output/return value description
5. Error cases and how to handle them
6. Example usage scenario

Be specific and technical. Infer reasonable details from context.
Write in the same language as the user's input (Vietnamese if they wrote Vietnamese).
Return plain text, not JSON.`;

const TOOL_EXTRACT_CHUNK_PROMPT = `Extract ALL tools/API calls described in this document chunk. For each tool found:

Return a JSON array. Each item:
{
  "name": "snake_case_tool_name",
  "description": "what this tool does",
  "trigger": "when the agent should call this tool",
  "parameters": [
    { "name": "paramName", "type": "string|number|boolean|array|object", "description": "...", "required": true }
  ],
  "returns": "what the tool returns"
}

Rules:
- Extract EVERY tool mentioned, do not skip any.
- If a parameter type is array_string or array_object, use "array".
- If no tools are found in this chunk, return [].
- Return ONLY the JSON array, no markdown, no explanation.`;

/**
 * Try to parse an AMIS agent export JSON ({ agent, tools, skills }).
 * Returns DetectedTool[] + compact summary text, or null if not this format.
 */
function tryParseAmisAgentJson(raw: string): { tools: DetectedTool[]; text: string } | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || !data.tools || !data.agent) return null;

    const agent = data.agent as { name?: string };
    const toolsMap = data.tools as Record<string, {
      name: string;
      display_name?: string;
      description?: string;
      parameters?: {
        input?: {
          properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
          required?: string[];
        };
      };
    }>;

    type SkillEntry = { name?: string; skill_name?: string; display_name?: string; description?: string; steps?: unknown[]; tools?: string[] };
    const skillsRaw = data.skills as Record<string, SkillEntry> | SkillEntry[] | undefined;
    const skillEntries: [string, SkillEntry][] = !skillsRaw
      ? []
      : Array.isArray(skillsRaw)
        ? skillsRaw.map((s, i) => [s.skill_name ?? s.name ?? String(i), s])
        : Object.entries(skillsRaw);

    const tools: DetectedTool[] = Object.entries(toolsMap).map(([key, tool]) => {
      const input = tool.parameters?.input;
      const requiredSet = new Set(input?.required ?? []);
      const parameters: ToolParameter[] = Object.entries(input?.properties ?? {}).map(([pName, p]) => ({
        name: pName,
        type: (['string', 'number', 'boolean', 'array', 'object'].includes(p.type ?? '')
          ? p.type as ToolParameter['type']
          : 'string'),
        description: p.description ?? '',
        required: requiredSet.has(pName),
        ...(p.enum ? { enum: p.enum } : {}),
      }));

      const ownerSkill = skillEntries.find(([, s]) => s.tools?.includes(key));
      const trigger = ownerSkill
        ? `When the user asks about: ${ownerSkill[1].description ?? ownerSkill[0]}`
        : `When the agent needs to call ${tool.display_name ?? key}`;

      return {
        name: key,
        description: tool.display_name
          ? `${tool.display_name}${tool.description ? ' — ' + tool.description : ''}`
          : (tool.description ?? key),
        trigger,
        parameters,
        returns: `Result from ${key}`,
      };
    });

    const lines: string[] = [`## Agent: ${agent.name || 'Unknown'}`, '', `### Tools (${tools.length} total)`, ''];
    for (const t of tools) {
      lines.push(`#### ${t.name}`, t.description);
      for (const p of t.parameters) lines.push(`  - ${p.name} [${p.type}]${p.required ? ' *' : ''}: ${p.description}`);
      lines.push('');
    }
    if (skillEntries.length > 0) {
      lines.push(`### Skills (${skillEntries.length} total)`, '');
      for (const [key, skill] of skillEntries) {
        lines.push(`#### ${key}`);
        if (skill.description) lines.push(skill.description);
        if (Array.isArray(skill.tools) && skill.tools.length) lines.push(`Uses tools: ${skill.tools.join(', ')}`);
        lines.push('');
      }
    }

    return { tools, text: lines.join('\n') };
  } catch {
    return null;
  }
}

/**
 * Split text into chunks ≤ maxChars, keeping logical units intact.
 *
 * Strategy (in order of priority):
 * 1. Semantic boundaries: split at "SKILL N:" / "Tool N:" headings (agent spec docs)
 * 2. Blank-line paragraph boundaries (\n\n)
 * 3. Single-newline boundaries (\n)
 * 4. Hard split at maxChars (last resort)
 *
 * DOCX extracted by mammoth often arrives as one continuous string with no
 * newlines — strategies 1 and 4 handle that case.
 */
function chunkText(text: string, maxChars = 10_000): string[] {
  if (text.length <= maxChars) return [text];

  // Strategy 1: split at semantic headings (agent spec / AMIS DOCX format)
  const semanticRe = /(?=(?:SKILL \d+:|Tool 1:))/g;
  const semanticParts = text.split(semanticRe).filter(p => p.length > 0);
  if (semanticParts.length > 2) {
    return mergeIntoChunks(semanticParts, maxChars);
  }

  // Strategy 2 & 3: newline boundaries
  const separator = text.includes('\n\n') ? /\n{2,}/ : /\n/;
  const lineParts = text.split(separator).filter(p => p.length > 0);
  if (lineParts.length > 1) {
    return mergeIntoChunks(lineParts, maxChars);
  }

  // Strategy 4: hard split
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += maxChars) {
    chunks.push(text.slice(start, start + maxChars).trim());
  }
  return chunks.filter(c => c.length > 0);
}

/** Greedily merge parts into chunks ≤ maxChars. Oversized single parts are hard-split. */
function mergeIntoChunks(parts: string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const part of parts) {
    const candidate = current ? current + ' ' + part : part;
    if (candidate.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = part;
    } else {
      current = candidate;
    }
    if (current.length > maxChars) {
      for (let start = 0; start < current.length; start += maxChars) {
        chunks.push(current.slice(start, start + maxChars).trim());
      }
      current = '';
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

/**
 * Extract tools from large plain-text documents by chunking and running the
 * LLM extractor on each chunk in parallel, then deduplicating by tool name.
 * Used for DOCX/text agent specs that don't have machine-readable JSON.
 */
async function extractToolsFromChunks(text: string): Promise<DetectedTool[] | null> {
  const chunks = chunkText(text, 10_000);
  console.log(`[ingest] extractToolsFromChunks: ${chunks.length} chunks from ${text.length} chars`);

  const results: DetectedTool[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const batch = await llm.chatJSON<DetectedTool[]>({
      system: TOOL_EXTRACT_CHUNK_PROMPT,
      user: chunk,
      temperature: 0.1,
    }).catch((err) => {
      console.warn(`[ingest] chunk ${i} failed:`, err);
      return [] as DetectedTool[];
    });
    console.log(`[ingest] chunk ${i}: got ${Array.isArray(batch) ? batch.length : 'non-array'} tools`);
    results.push(Array.isArray(batch) ? batch : []);
  }

  const seen = new Map<string, DetectedTool>();
  for (const batch of results) {
    if (!Array.isArray(batch)) continue;
    for (const tool of batch) {
      if (!tool?.name || seen.has(tool.name)) continue;
      seen.set(tool.name, {
        ...tool,
        name: tool.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        parameters: tool.parameters ?? [],
      });
    }
  }

  console.log(`[ingest] extractToolsFromChunks: total unique tools = ${seen.size}`);
  return seen.size > 0 ? [...seen.values()] : null;
}

/**
 * If a single piece of text is too large to fit in the pipeline's LLM context,
 * summarize it first rather than hard-truncating (which silently drops tools/steps).
 *
 * Threshold: 20 000 chars (~5k tokens). Below that, pass through verbatim.
 */
async function summarizeIfNeeded(text: string, label: string): Promise<string> {
  const SUMMARIZE_THRESHOLD = 20_000;
  if (text.length <= SUMMARIZE_THRESHOLD) return text;

  const summary = await llm.chat({
    system: SUMMARIZE_PROMPT,
    user: text,
    temperature: 0.1,
  });
  return `[Summarized from ${label} — original ${text.length} chars]\n\n${summary}`;
}

/**
 * Combine all file contents + user message into a single document text.
 * If only a short text description is given (no files), expand it first.
 *
 * Returns { documentText, preDetectedTools } where preDetectedTools is non-null
 * when tools were extracted directly from structured data — caller should skip
 * LLM-based detection in that case.
 */
export async function ingest(
  files: ParsedFile[],
  userMessage: string,
): Promise<{ documentText: string; preDetectedTools: DetectedTool[] | null }> {
  const parts: string[] = [];
  let preDetectedTools: DetectedTool[] | null = null;

  if (userMessage.trim()) {
    const isShort = userMessage.trim().length < 200 && files.length === 0;
    if (isShort) {
      const expanded = await llm.chatFast({
        system: EXPAND_PROMPT,
        user: userMessage.trim(),
        temperature: 0.4,
      });
      parts.push(`## User request\n\n${userMessage}\n\n## Expanded specification\n\n${expanded}`);
    } else {
      parts.push(`## User description\n\n${userMessage}`);
    }
  }

  for (const file of files) {
    if (file.type === 'image' && file.base64) {
      const analysis = await llm.chatWithImage({
        prompt: IMAGE_PROMPT,
        imageBase64: file.base64,
        mimeType: file.mimeType,
      });
      parts.push(`## Image: ${file.name}\n\n${analysis}`);

    } else if (file.type === 'pdf' && file.base64 && (!file.text || file.text.length < 100)) {
      const analysis = await llm.chatWithImage({
        prompt: `This is a PDF document. Extract ALL text, tables, and structure.\n\n${IMAGE_PROMPT}`,
        imageBase64: file.base64,
        mimeType: 'image/png',
      });
      parts.push(`## PDF: ${file.name}\n\n${analysis}`);

    } else if (file.text) {
      console.log(`[ingest] file "${file.name}": ${file.text.length} chars, type=${file.type}`);

      // 1. Machine-readable AMIS agent export JSON → parse directly, zero LLM, guaranteed complete
      const amis = tryParseAmisAgentJson(file.text);
      if (amis) {
        console.log(`[ingest] AMIS JSON detected → ${amis.tools.length} tools (no LLM)`);
        preDetectedTools = amis.tools;
        parts.push(`## File: ${file.name} (AMIS agent export)\n\n${amis.text}`);

      // 2. Large plain-text/DOCX spec → chunk + LLM extract sequentially, then deduplicate
      } else if (file.text.length > 20_000) {
        console.log(`[ingest] large file → extractToolsFromChunks`);
        const extracted = await extractToolsFromChunks(file.text);
        if (extracted && extracted.length > 0) {
          console.log(`[ingest] extracted ${extracted.length} tools from chunks`);
          preDetectedTools = extracted;
          // Build compact summary from extracted tools — avoids sending 36k+ raw text
          // to summarizeIfNeeded which would hit LLM context limits.
          const summaryLines = [
            `## File: ${file.name} (extracted ${extracted.length} tools)`,
            '',
            ...extracted.map(t =>
              `### ${t.name}\n${t.description}\nTrigger: ${t.trigger}\nParams: ${
                t.parameters.map(p => `${p.name}(${p.type}${p.required ? '*' : ''})`).join(', ')
              }`
            ),
          ];
          parts.push(summaryLines.join('\n'));
        } else {
          // Extraction yielded nothing — fall back to summarize for assemble phase
          const content = await summarizeIfNeeded(file.text, file.name);
          parts.push(`## File: ${file.name}\n\n${content}`);
        }

      // 3. Small file → pass through verbatim, let detectTools handle it normally
      } else {
        parts.push(`## File: ${file.name}\n\n${file.text}`);
      }
    }
  }

  return { documentText: parts.join('\n\n---\n\n'), preDetectedTools };
}
