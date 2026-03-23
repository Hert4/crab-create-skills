import * as llm from '../llm';
import type { ParsedFile } from '../../sidepanel/lib/types';

const IMAGE_PROMPT = `Analyze this image of a business process/workflow.
Extract ALL text, steps, rules, and structure visible.
If it's a flowchart/diagram, describe every node and connection.
If it contains Vietnamese, keep Vietnamese.
Mark unclear parts with [unclear].
Return structured text, not JSON.`;

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

/**
 * Combine all file contents + user message into a single document text.
 * If only a short text description is given (no files), expand it first.
 */
export async function ingest(files: ParsedFile[], userMessage: string): Promise<string> {
  const parts: string[] = [];

  if (userMessage.trim()) {
    // Short description with no files → expand into full spec using LLM
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
      parts.push(`## File: ${file.name}\n\n${file.text}`);
    }
  }

  const combined = parts.join('\n\n---\n\n');

  if (combined.length > 12000) {
    return combined.slice(0, 12000) + '\n\n[... truncated for processing]';
  }

  return combined;
}
