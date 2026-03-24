import * as llm from '../llm';
import { AGENT_SYSTEM_PROMPT } from '../prompts/agent-system';
import { AGENT_CONFIG_PROMPT } from '../prompts/agent-config';
import type {
  IntentResult,
  StepResult,
  ConstraintResult,
  ToolOutput,
  AgentTemplate,
  AgentConfig,
  AgentMetadata,
} from '../../sidepanel/lib/types';

interface LLMConfigResponse {
  temperature: number;
  memoryType: 'none' | 'summary' | 'full';
  maxTurns: number;
  maxTokens: number;
  reasoning?: string;
}

const FALLBACK_CONFIG: LLMConfigResponse = {
  temperature: 0.3,
  memoryType: 'summary',
  maxTurns: 20,
  maxTokens: 1024,
};

/**
 * Use LLM (fast model) to infer AgentConfig from intent, steps, and constraints.
 * Falls back to safe defaults if the LLM call fails.
 */
async function inferAgentConfig(
  intent: IntentResult,
  steps: StepResult,
  constraints: ConstraintResult,
  modelTarget: string,
): Promise<AgentConfig> {
  const userPayload = JSON.stringify({
    skill_name: intent.skill_name,
    skill_type: intent.skill_type,
    domain: intent.domain,
    description: intent.description,
    target_user: intent.target_user,
    step_count: steps.steps.length,
    decision_points: steps.decision_points.length,
    hard_rules_count: constraints.hard_rules.length,
    edge_cases_count: constraints.edge_cases.length,
    sample_steps: steps.steps.slice(0, 3).map(s => s.action),
  }, null, 2);

  let inferred: LLMConfigResponse = FALLBACK_CONFIG;

  try {
    inferred = await llm.chatJSONFast<LLMConfigResponse>({
      system: AGENT_CONFIG_PROMPT,
      user: userPayload,
      temperature: 0.1,
    });
  } catch {
    // Non-fatal: fall back to safe defaults
  }

  // Clamp values to valid ranges
  const temperature = Math.min(1.0, Math.max(0.0, inferred.temperature ?? FALLBACK_CONFIG.temperature));
  const memoryType = (['none', 'summary', 'full'] as const).includes(inferred.memoryType)
    ? inferred.memoryType
    : FALLBACK_CONFIG.memoryType;
  const maxTurns = Math.min(50, Math.max(5, inferred.maxTurns ?? FALLBACK_CONFIG.maxTurns));
  const maxTokens = Math.min(8192, Math.max(512, inferred.maxTokens ?? FALLBACK_CONFIG.maxTokens));

  return {
    model: modelTarget || 'gpt-4o-mini',
    temperature,
    max_tokens: maxTokens,
    top_p: 1,
    memory: {
      type: memoryType,
      max_turns: maxTurns,
    },
  };
}

/**
 * Detect which tool schema format to use based on target model name.
 */
function detectSchemaFormat(modelTarget: string): 'anthropic' | 'openai' {
  if (!modelTarget) return 'openai';
  return /claude/i.test(modelTarget) ? 'anthropic' : 'openai';
}

/**
 * Assemble the complete AgentTemplate from all prior phase outputs.
 */
export async function assembleAgent(
  intent: IntentResult,
  steps: StepResult,
  constraints: ConstraintResult,
  skillContent: string,
  toolOutput: ToolOutput,
  modelTarget: string,
): Promise<AgentTemplate> {
  const userPayload = JSON.stringify({
    intent,
    steps,
    constraints,
    tools: toolOutput.tools.length > 0 ? toolOutput.tools : 'none — this agent operates purely through reasoning',
  }, null, 2);

  const [systemPrompt, config] = await Promise.all([
    llm.chat({
      system: AGENT_SYSTEM_PROMPT,
      user: userPayload,
      temperature: 0.3,
    }),
    inferAgentConfig(intent, steps, constraints, modelTarget),
  ]);

  const schemaFormat = detectSchemaFormat(modelTarget);

  const metadata: AgentMetadata = {
    name: intent.skill_name,
    version: '1.0.0',
    domain: intent.domain,
    description: intent.description,
  };

  return {
    metadata,
    systemPrompt,
    skillContent,
    tools: { ...toolOutput, preferredFormat: schemaFormat },
    config: { ...config, model: modelTarget || config.model },
  };
}
