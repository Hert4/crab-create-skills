import * as llm from '../llm';
import type { ParsedFile, DetectedTool, ToolParameter } from '../../sidepanel/lib/types';

function dbg(msg: string) {
  console.log('[ingest]', msg);
}

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

const TOOL_LIST_PROMPT = `Read this document excerpt and list the name of EVERY callable tool or function mentioned.

A tool name is a snake_case identifier that is explicitly the name of a callable tool — for example:
- It appears as a heading like "Tool 3: get_candidate" or "Function: get_data"
- It appears in a dedicated "name" or "function name" field
- It appears as a standalone code identifier that IS ITSELF the callable unit

Do NOT include any of these:
- Any string that contains "@" or "#" — these are routing/path strings, not callable names
- Any identifier that appears INSIDE a path like "group@subgroup#identifier" — even the part after "#" is NOT a tool name on its own
- Any identifier that appears in parentheses after a human-readable display name, like "Plugin Display Name (plugin_identifier)" — that parenthesized identifier is a plugin/module container, not a callable tool
- Plugin, module, or group names — these are containers that hold tools, not callable tools themselves
- Skill or workflow names
- Infrastructure labels (http_amis, POST, auth type, base_url, etc.)
- Names you infer or derive from descriptions — only names that appear literally as the callable tool's own name

A callable tool has its own INPUT PARAMS section or is explicitly named as "Tool N: name".
A plugin/module identifier appears in a "Plugin |" row and groups multiple tools together — do NOT include it.

Return ONLY a JSON array of strings.
If no tool names are found in this excerpt, return [].`;

const TOOL_DETAIL_PROMPT = `You are given a document and ONE tool name. Extract the full definition of that specific tool.

Return a single JSON object:
{
  "name": "<use EXACTLY the tool name given in the input — do not rename, do not infer a different name>",
  "description": "what this tool does",
  "trigger": "when the agent should call this tool",
  "parameters": [
    { "name": "paramName", "type": "string|number|boolean|array|object", "description": "...", "required": true }
  ],
  "returns": "description of output fields"
}

Rules:
- The "name" field MUST be exactly the tool name provided in the input. Never substitute it.
- For array or list parameter types → use "array".
- Include ALL input parameters listed for this tool.
- "returns" should describe the key output fields by name.
- If the tool is not found in the document, still use the exact given name and return empty parameters.
- Return ONLY the JSON object, no markdown, no explanation.`;

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
 * Extract tools from large plain-text documents.
 *
 * Pass 1 — collect tool names:
 *   Slice into overlapping windows (8k chars, 1k overlap) so no tool definition
 *   is ever split across a boundary without appearing in at least one full window.
 *   Ask LLM to list names from each window in parallel.
 *   Union all names → complete list, no misses.
 *
 * Pass 2 — extract details:
 *   For each tool, feed only the window(s) that mentioned its name.
 *   Each call is small and focused → no overwhelm, no misses.
 */
async function extractToolsFromChunks(text: string): Promise<DetectedTool[] | null> {
  const WINDOW = 8_000;
  const OVERLAP = 1_000;
  const STEP = WINDOW - OVERLAP;

  // Build overlapping windows
  const windows: string[] = [];
  for (let start = 0; start < text.length; start += STEP) {
    windows.push(text.slice(start, start + WINDOW));
  }

  dbg(`extractToolsFromChunks: ${text.length} chars → ${windows.length} windows`);
  windows.forEach((w, i) => dbg(`window[${i}] preview: ${w.slice(0, 300)}`))

  // Pass 1: collect names from every window in parallel
  const nameResults = await Promise.all(
    windows.map((w, i) =>
      llm.chatJSON<string[]>({
        system: TOOL_LIST_PROMPT,
        user: w,
        temperature: 0.1,
      }).catch((err) => {
        console.warn(`[ingest] pass1 window ${i} failed:`, err);
        return [] as string[];
      })
    )
  );

  // Log what each window found
  nameResults.forEach((names, i) => dbg(`pass1 window[${i}] found: ${JSON.stringify(names)}`))

  // Map: tool name → set of window indices where it was found
  const nameToWindows = new Map<string, Set<number>>();
  nameResults.forEach((names, idx) => {
    if (!Array.isArray(names)) return;
    for (const n of names) {
      if (typeof n !== 'string' || !n.trim()) continue;
      if (!nameToWindows.has(n)) nameToWindows.set(n, new Set());
      nameToWindows.get(n)!.add(idx);
    }
  });

  // Post-Pass-1 dedup: remove obvious false positives before Pass 2.
  //
  // Rule A — suffix fragment only: drop X if another collected name Y ends with "_X".
  //   e.g. "save_email_template" dropped when "function_recruitment_save_email_template" exists.
  //   This is safe because a real tool would never be a pure suffix of a longer tool name.
  //
  // NOTE: We intentionally do NOT filter by "#name" or "(name)" patterns here,
  // because real tool names often appear BOTH as standalone names AND inside Action Paths.
  // Those cases must be handled by the prompt, not by code-level filtering.
  const allNames = [...nameToWindows.keys()];
  const toolNames = allNames.filter(name =>
    !allNames.some(other => other !== name && other.endsWith('_' + name))
  );
  const dropped = allNames.filter(n => !toolNames.includes(n));
  if (dropped.length > 0) dbg(`pass1 dedup dropped: ${JSON.stringify(dropped)}`);

  dbg(`pass1 FINAL: ${toolNames.length} names: ${JSON.stringify(toolNames)}`);
  if (toolNames.length === 0) return null;

  // Pass 2: extract detail using only the relevant window(s) per tool
  const results = await Promise.all(
    toolNames.map((name, i) => {
      const relevantWindows = [...(nameToWindows.get(name) ?? [])].map(idx => windows[idx]);
      const context = relevantWindows.join('\n\n---\n\n');

      return llm.chatJSON<DetectedTool>({
        system: TOOL_DETAIL_PROMPT,
        user: `Tool name: ${name}\n\nDocument excerpt:\n${context}`,
        temperature: 0.1,
      }).then(t => ({
        // Always enforce the Pass 1 name — LLM must not rename the tool
        ...t,
        name,
        parameters: t.parameters ?? [],
      })).catch((err) => {
        console.warn(`[ingest] pass2 tool "${name}" (${i}) failed:`, err);
        return null;
      });
    })
  );

  const tools: DetectedTool[] = results
    .filter((t): t is DetectedTool => t !== null && t.description !== '')
    .map(t => ({ ...t, parameters: t.parameters ?? [] }));

  dbg(`pass2: ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
  return tools.length > 0 ? tools : null;
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
      dbg(`file "${file.name}": ${file.text.length} chars, type=${file.type}`);

      // 1. Machine-readable AMIS agent export JSON → parse directly, zero LLM, guaranteed complete
      const amis = tryParseAmisAgentJson(file.text);
      if (amis) {
        dbg(`AMIS JSON detected → ${amis.tools.length} tools`);
        preDetectedTools = amis.tools;
        parts.push(`## File: ${file.name} (AMIS agent export)\n\n${amis.text}`);

      // 2. Any structured text file (DOCX, plain text) → always run 2-pass extraction.
      //    The threshold check is removed: even small files can describe many tools,
      //    and the 2-pass approach is reliable regardless of document size.
      } else {
        dbg(`running 2-pass extraction on "${file.name}"`);
        const extracted = await extractToolsFromChunks(file.text);
        if (extracted && extracted.length > 0) {
          dbg(`extracted ${extracted.length} tools: ${extracted.map(t => t.name).join(', ')}`);
          preDetectedTools = extracted;
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
          // Nothing found — pass verbatim for downstream LLM to handle
          const content = await summarizeIfNeeded(file.text, file.name);
          parts.push(`## File: ${file.name}\n\n${content}`);
        }
      }
    }
  }

  return { documentText: parts.join('\n\n---\n\n'), preDetectedTools };
}
