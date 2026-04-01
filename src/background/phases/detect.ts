import * as llm from '../llm';
import { TOOL_DETECT_PROMPT } from '../prompts/tool-detect';
import type { DetectedTool } from '../../sidepanel/lib/types';

/**
 * Analyze document context and detect actions that require external tool calls.
 * Runs in parallel with extract phase.
 */
export async function detectTools(documentText: string): Promise<DetectedTool[]> {
  try {
    const tools = await llm.chatJSON<DetectedTool[]>({
      system: TOOL_DETECT_PROMPT,
      user: documentText,
      temperature: 0.2,
    });

    return tools.map(tool => ({
      ...tool,
      parameters: tool.parameters || [],
    }));
  } catch {
    return [];
  }
}
