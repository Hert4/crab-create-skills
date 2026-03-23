import * as llm from '../llm';
import { AGENT_SYSTEM_PROMPT } from '../prompts/agent-system';
import type {
  IntentResult,
  StepResult,
  ConstraintResult,
  ToolOutput,
  AgentTemplate,
  AgentConfig,
  AgentMetadata,
} from '../../sidepanel/lib/types';

/**
 * Determine AgentConfig based on domain from intent.
 */
function buildAgentConfig(intent: IntentResult, modelFast: string): AgentConfig {
  const domain = intent.domain.toLowerCase();
  const skillType = intent.skill_type;

  // Temperature: low for factual/process domains, higher for creative/generative
  let temperature = 0.3;
  let memoryType: 'none' | 'summary' | 'full' = 'summary';
  let maxTurns = 20;
  let maxTokens = 1024;

  if (/support|service|helpdesk|customer/i.test(domain)) {
    temperature = 0.3;
    memoryType = 'summary';
    maxTurns = 30;
    maxTokens = 1024;
  } else if (/finance|accounting|tax|payment|invoice/i.test(domain)) {
    temperature = 0.1;
    memoryType = 'none';
    maxTurns = 10;
    maxTokens = 2048;
  } else if (/legal|compliance|policy|regulation/i.test(domain)) {
    temperature = 0.1;
    memoryType = 'full';
    maxTurns = 15;
    maxTokens = 2048;
  } else if (/data|analysis|report|analytics/i.test(domain)) {
    temperature = 0.1;
    memoryType = 'none';
    maxTurns = 10;
    maxTokens = 4096;
  } else if (/creative|writing|marketing|content/i.test(domain)) {
    temperature = 0.8;
    memoryType = 'full';
    maxTurns = 20;
    maxTokens = 2048;
  } else if (/hr|human.resource|recruitment|onboarding/i.test(domain)) {
    temperature = 0.4;
    memoryType = 'summary';
    maxTurns = 25;
    maxTokens = 1024;
  } else if (/sales|crm|lead|opportunity/i.test(domain)) {
    temperature = 0.5;
    memoryType = 'summary';
    maxTurns = 30;
    maxTokens = 1024;
  }

  // Preference skills are conversational — use full memory
  if (skillType === 'preference') {
    memoryType = 'full';
    temperature = Math.max(temperature, 0.5);
  }

  return {
    model: modelFast || 'gpt-4o-mini',
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
 * Assemble the complete AgentTemplate from all prior phase outputs.
 */
export async function assembleAgent(
  intent: IntentResult,
  steps: StepResult,
  constraints: ConstraintResult,
  skillContent: string,
  toolOutput: ToolOutput,
  modelFast: string,
): Promise<AgentTemplate> {
  const toolNames = toolOutput.tools.map(t => `${t.name}: ${t.description}`).join('\n');

  const userPayload = JSON.stringify({
    intent,
    steps,
    constraints,
    tools: toolOutput.tools.length > 0 ? toolOutput.tools : 'none — this agent operates purely through reasoning',
  }, null, 2);

  const systemPrompt = await llm.chat({
    system: AGENT_SYSTEM_PROMPT,
    user: userPayload,
    temperature: 0.3,
  });

  const config = buildAgentConfig(intent, modelFast);

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
    tools: toolOutput,
    config: { ...config, model: modelFast || config.model },
  };
}
