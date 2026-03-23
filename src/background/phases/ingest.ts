import * as llm from '../llm';
import type { ParsedFile } from '../../sidepanel/lib/types';

const IMAGE_PROMPT = `Analyze this image of a business process/workflow.
Extract ALL text, steps, rules, and structure visible.
If it's a flowchart/diagram, describe every node and connection.
If it contains Vietnamese, keep Vietnamese.
Mark unclear parts with [unclear].
Return structured text, not JSON.`;

/**
 * Combine all file contents + user message into a single document text.
 */
export async function ingest(files: ParsedFile[], userMessage: string): Promise<string> {
  const parts: string[] = [];

  if (userMessage.trim()) {
    parts.push(`## User description\n\n${userMessage}`);
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
