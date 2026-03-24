// ==================== Settings ====================
export interface Settings {
  provider: 'openai-compatible' | 'openai' | 'anthropic' | 'ollama';
  baseUrl: string;
  apiKey: string;
  modelStrong: string;   // Extraction, assembly, skill improvement
  modelFast: string;     // Chat, grading, baseline execution
  modelTarget: string;   // Model the agent will be deployed on — determines tool schema format
  maxIterations: number;
  minScore: number;
  evalCount: number;     // Number of test cases for evaluation (default 6)
  language: 'vi' | 'en';
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'openai-compatible',
  baseUrl: '',
  apiKey: '',
  modelStrong: '',
  modelFast: '',
  modelTarget: '',
  maxIterations: 3,
  minScore: 0.85,
  evalCount: 6,
  language: 'vi',
};

// ==================== Files ====================
export interface ParsedFile {
  name: string;
  type: 'pdf' | 'docx' | 'image' | 'text';
  size: number;
  text: string;
  base64?: string;
  mimeType?: string;
  pageCount?: number;
}

// ==================== Chat ====================
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: ParsedFile[];
  isStreaming?: boolean;
}

// ==================== Pipeline ====================
export type Phase = 'idle' | 'ingest' | 'extract' | 'assemble' | 'evaluate' | 'validate' | 'agent' | 'optimize' | 'done' | 'error';

export interface CompilationState {
  phase: Phase;
  progress: number;
  detail: string;
  skill: SkillOutput | null;
  evals: EvalSet | null;
  validation: ValidationResult | null;
  agentTemplate: AgentTemplate | null;
  error: string | null;
}

// ==================== Phase 2: Extraction ====================
export interface IntentResult {
  skill_name: string;
  skill_type: 'capability' | 'preference';
  description: string;
  target_user: string;
  domain: string;
}

export interface Step {
  order: number;
  action: string;
  details: string;
  condition: string | null;
  inputs: string[];
  outputs: string[];
  tools_needed: string[];
  error_handling: string;
}

export interface StepResult {
  workflow_name: string;
  steps: Step[];
  decision_points: { after_step: number; condition: string; if_true: number; if_false: number }[];
}

export interface ConstraintResult {
  hard_rules: { rule: string; source: string }[];
  soft_rules: { rule: string; source: string }[];
  edge_cases: { case_name: string; handling: string; source: string }[];
  exceptions: { exception: string; when: string; source: string }[];
  validations: { field: string; check: string; source: string }[];
  permissions: { action: string; who: string; source: string }[];
}

// ==================== Phase 3: Assembly ====================
export interface SkillOutput {
  name: string;
  content: string;
  intent: IntentResult;
  steps: StepResult;
  constraints: ConstraintResult;
}

// ==================== Phase 4: Evals ====================
export interface EvalSet {
  skill_name: string;
  trigger_evals: { query: string; should_trigger: boolean }[];
  functional_evals: FunctionalEval[];
}

export interface FunctionalEval {
  id: number;
  prompt: string;
  expected_output: string;
  assertions: string[];  // Plain verifiable statements e.g. "The output includes the tax amount"
}

// ==================== Phase 5: Validation ====================
export interface GradeResult {
  overall_score: number;
  assertions: { text: string; passed: boolean; evidence: string }[];
  feedback: string;
  reasoning?: string;
}

export interface CompareResult {
  winner: 'A' | 'B' | 'TIE';
  score_a: number;
  score_b: number;
  reasoning: string;
  assertions: { text: string; a_passed: boolean; b_passed: boolean }[];
  feedback: string;
}

export interface IterationResult {
  iteration: number;
  avgScore: number;
  avgBaseline: number;
  improvement: number;
  evalResults: {
    evalId: number;
    withSkillOutput: string;
    withoutSkillOutput: string;
    grade: GradeResult;
    baselineGrade: GradeResult;
  }[];
}

export interface ValidationResult {
  iterations: IterationResult[];
  bestScore: number;
  bestIteration: number;
  improvementOverBaseline: number;
  finalSkillContent: string;
}

// ==================== Tool Detection & Agent Template ====================
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: string[];
}

export interface DetectedTool {
  name: string;            // snake_case, e.g. "search_customer"
  description: string;     // What the tool does
  trigger: string;         // When the agent should call this tool
  parameters: ToolParameter[];
  returns: string;         // What the tool returns
}

export interface OpenAIToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description: string; enum?: string[] }>;
      required: string[];
    };
  };
}

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export interface ToolOutput {
  tools: DetectedTool[];
  openai: OpenAIToolDef[];
  anthropic: AnthropicToolDef[];
  openapi: string;             // YAML string
  preferredFormat: 'openai' | 'anthropic';  // Based on target model
}

export interface AgentConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  memory: {
    type: 'none' | 'summary' | 'full';
    max_turns: number;
  };
}

export interface AgentMetadata {
  name: string;
  version: string;
  domain: string;
  description: string;
}

export interface AgentTemplate {
  metadata: AgentMetadata;
  systemPrompt: string;
  skillContent: string;
  tools: ToolOutput;
  config: AgentConfig;
}

// ==================== History ====================
export interface HistoryEntry {
  id: string;
  timestamp: number;
  skillName: string;
  sourceFiles: string[];
  finalScore: number;
  skillContent: string;
}

// ==================== Message Passing ====================
// Sidepanel -> Background
export type ToBackground =
  | { type: 'COMPILE'; data: { files: ParsedFile[]; userMessage: string } }
  | { type: 'CHAT'; data: { message: string; context?: string; history?: { role: 'user' | 'assistant'; content: string }[] } }
  | { type: 'CLASSIFY'; data: { message: string } }
  | { type: 'VALIDATE'; data: { skillContent: string; evals: EvalSet } }
  | { type: 'OPTIMIZE_PROMPT'; data: { skillContent: string } }
  | { type: 'CANCEL' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; data: Settings };

// Background -> Sidepanel
export type ToSidepanel =
  | { type: 'PROGRESS'; phase: Phase; detail: string; progress: number }
  | { type: 'CHAT_STREAM'; delta: string }
  | { type: 'SKILL_READY'; skill: SkillOutput }
  | { type: 'EVALS_READY'; evals: EvalSet }
  | { type: 'VALIDATION_PROGRESS'; iteration: number; score: number }
  | { type: 'AGENT_READY'; agentTemplate: AgentTemplate }
  | { type: 'DONE'; result: CompilationState }
  | { type: 'ERROR'; error: string };
