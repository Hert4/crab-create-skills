# Crab Create Skills

A Chrome extension that converts business documents and process descriptions into production-ready Agent Skills, and optimizes existing prompts with automated evaluation. Upload a PDF, describe a workflow, or paste a prompt to optimize — Crab handles everything inside the extension, no backend required.

---

## Features

### 1. Skill Compilation

Upload documents or describe a process → Crab extracts business logic, assembles a structured `SKILL.md`, generates tool schemas, evaluates quality, and produces an agent template.

**Input:** PDF, DOCX, images, plain-text descriptions
**Output:** SKILL.md, tool schemas (OpenAI / Anthropic / OpenAPI), agent system prompt, evaluation results

### 2. Prompt Optimization

Paste any existing prompt and say "tối ưu prompt" or "optimize this prompt" → Crab rewrites it for clarity, adds edge cases, and validates the improvement with blind A/B testing against the original.

**Input:** Any prompt text (system prompt, instruction set, tool description)
**Output:** Optimized prompt with evaluation scores comparing before/after

### 3. Chat Assistant

Ask questions about the current compilation, get guidance on what to do next, or chat naturally. The assistant knows the context of your current skill, tools, and agent template.

### How the Router Works

There are no separate buttons — everything goes through chat. An intent classifier automatically routes each message:

| Intent | Trigger | What Happens |
|--------|---------|-------------|
| **Compile** | "tạo skill quản lý đơn hàng", attached files | Full compilation pipeline |
| **Optimize** | "tối ưu prompt này", "optimize", "cải thiện" | Prompt optimization pipeline |
| **Chat** | "giải thích cái skill vừa tạo", "hello" | Chat response with context |

Files attached → always Compile. Otherwise the classifier decides based on keywords and intent.

---

## Compilation Pipeline

Six sequential phases when creating a new skill:

### Phase 1 — Ingest
Parses uploaded files (PDF via pdf.js, DOCX via mammoth, images via vision model) and combines them with user-provided descriptions into a single document context.

### Phase 2 — Extract + Detect
Two parallel operations using the strong model:
- **Extract:** Intent (skill name, type, domain), ordered workflow steps (inputs, outputs, conditions, error handling), and constraints (hard rules, soft rules, edge cases, permissions, validations)
- **Detect:** Tool detection — identifies when the workflow needs external API calls and what parameters those tools require

### Phase 3 — Assemble
- **Tool Schemas:** Generates OpenAI function calling, Anthropic tool use, and OpenAPI 3.0 YAML schemas from detected tools (no LLM needed — deterministic conversion)
- **SKILL.md:** The strong model synthesizes extracted data into a complete skill with YAML frontmatter. A second pass rewrites the `description` field for better triggering accuracy

### Phase 4 — Evaluate
Generates a test set using the eval model:
- **14 trigger evals:** 8 should-trigger + 6 should-not-trigger near-misses
- **N functional evals:** Configurable via `evalCount` setting (default 6). Half happy-path, half edge cases. Each includes plain-string assertions for blind grading

### Phase 5 — Validate
Iterative blind A/B comparison loop:

```
For each test case:
  1. Run prompt WITH the skill loaded      → Output A
  2. Run same prompt WITHOUT skill (baseline) → Output B
  3. Blind grader scores A vs B (doesn't know which used the skill)

If avg score < minScore:
  4. Strong model rewrites the skill based on failed assertions
  5. Repeat (up to maxIterations)

Always keeps the best-scoring version, not the last one.
```

### Phase 6 — Agent Assembly
Generates a complete agent template: system prompt incorporating the skill, tool definitions, model configuration, and metadata. Ready to export and deploy.

---

## Prompt Optimization Pipeline

Three phases when optimizing an existing prompt:

### Phase 1 — Optimize
The strong model rewrites the prompt following optimization principles:
- Convert vague instructions to specific ones ("format correctly" → "format as YYYY-MM-DD")
- Replace passive voice with imperative commands
- Replace bare ALWAYS/NEVER rules with explained reasoning
- Add missing edge case handling
- Add concrete input → output examples for complex logic
- Restructure for clarity and remove contradictions

### Phase 2 — Evaluate
Generates test cases based on the **original prompt** — the LLM reads the prompt, infers its purpose, and creates realistic user scenarios to test it.

### Phase 3 — Validate
Same blind A/B loop as skill validation, but comparing:
- **A:** Output using the **optimized** prompt as system prompt
- **B:** Output using the **original** prompt as system prompt

If score is low, the prompt improver rewrites based on failures and re-validates. Keeps the best-scoring version across all iterations.

---

## How Evaluation Works

Both pipelines use the same evaluation framework. Here's a concrete example:

```
Original prompt: "Tính thuế cho nhân viên"
Optimized prompt: [rewritten with tax brackets, deductions, edge cases]

Test case:
  prompt: "Tính thuế TNCN cho lương 25 triệu, có 1 người phụ thuộc"
  assertions:
    - "Áp dụng bậc thuế lũy tiến đúng"
    - "Trừ giảm trừ gia cảnh 11 triệu + 4.4 triệu"
    - "Kết quả cuối cùng là số tiền cụ thể"

┌──────────────────────────────────────────────┐
│ WITH OPTIMIZED PROMPT (A)                    │
│ → "Thuế TNCN: Thu nhập chịu thuế =          │
│    25tr - 11tr - 4.4tr = 9.6tr              │
│    Bậc 1: 5tr × 5% = 250k                   │
│    Bậc 2: 4.6tr × 10% = 460k               │
│    Tổng thuế: 710,000đ"                      │
│                                              │
│ WITH ORIGINAL PROMPT (B)                     │
│ → "Thuế khoảng 1-2 triệu tùy trường hợp"  │
│                                              │
│ BLIND GRADER                                 │
│ → A: 0.92 (passed all assertions)            │
│ → B: 0.35 (vague, no calculation shown)      │
└──────────────────────────────────────────────┘
```

**Key design decisions:**
- The grader is **blind** — it receives Output A and Output B in random conceptual order and doesn't know which used the skill/optimized prompt. This prevents bias.
- Each iteration **keeps the best version**, not the last. If iter 1 scores 78% and iter 2 scores 15%, the final output is iter 1's version.
- The improver sees **which assertions failed and why**, so it makes targeted fixes rather than rewriting everything.

---

## Model Roles

Three configurable models to balance cost vs quality:

| Model | Role | Used for |
|-------|------|----------|
| **Strong** | Creative/analytical work | Extract intent/steps/constraints, assemble skill, optimize prompt, improve on failures |
| **Fast** | Execution/chat | Chat replies, run test cases (with-skill and baseline), description optimization, classify intent |
| **Eval** | Test generation/grading | Generate test cases, blind A/B grading (falls back to Fast if not set) |

**Reasoning model support:** The extension detects OpenAI reasoning models (o-series, gpt-5.x) and automatically uses `max_completion_tokens` instead of `max_tokens`, and omits the `temperature` parameter.

---

## Retry & Error Handling

### Automatic Retry
All LLM API calls are wrapped with exponential backoff retry:
- Retries on: 429 (rate limit), 500, 502, 503, 504
- Up to 3 retries with delays: 1s → 2s → 4s → 8s
- Non-retryable errors (400, 401, 403) fail immediately

### Error Display
Errors surface as a toast notification with 7-second auto-dismiss:

| Error | Displayed as |
|-------|-------------|
| 401 / authentication failure | API Key is invalid |
| Network / fetch failure | Cannot connect to API |
| 429 / rate limit | Rate limit exceeded (auto-retried first) |
| Model not configured | Model name missing in Settings |
| JSON parse failure | Model returned invalid data (auto-retried once) |
| Missing settings on send | Blocks pipeline, prompts to open Settings |

---

## UI Tabs

| Tab | Purpose |
|-----|---------|
| **Chat** | Send messages, upload files, view responses. All interaction starts here. |
| **Preview** | Rendered SKILL.md output (or optimized prompt). Supports editing, copy, download. |
| **Evals** | Evaluation dashboard — scores per iteration, score chart, A/B comparison details for each test case. |
| **Tools** | Generated tool schemas in OpenAI, Anthropic, and OpenAPI formats. |
| **Agent** | Complete agent template with system prompt. Copy or export. |
| **History** | Past compilations with scores. Click to reload. |
| **Settings** | API configuration, validation parameters. |

---

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Provider | openai-compatible | API provider (OpenAI Compatible, OpenAI, Anthropic, Ollama) |
| Base URL | — | API endpoint URL |
| API Key | — | API authentication key |
| Strong Model | — | Model for extraction, assembly, improvement |
| Fast Model | — | Model for chat, execution, grading |
| Target Model | — | Model the agent will be deployed on (determines tool schema format) |
| Max Iterations | 3 | Maximum validation iterations before stopping |
| Min Score | 0.85 | Target score — stop iterating once reached |
| Eval Count | 6 | Number of functional test cases to generate (half happy-path, half edge cases) |
| Language | vi | UI language for generated content |

---

## Setup

**Requirements**
- Chrome 114+ (Side Panel API)
- An OpenAI-compatible, OpenAI, Anthropic, or Ollama API endpoint

**Install**
1. Clone the repository
2. `npm install`
3. `npm run build`
4. Open `chrome://extensions`, enable Developer Mode
5. Click "Load unpacked" and select the `dist/` folder
6. Click the Crab icon in the toolbar to open the side panel
7. Go to Settings tab and configure your API endpoint + models

---

## Development

```
npm run dev      # Start Vite dev server with HMR
npm run build    # Production build to dist/
```

After any build, reload the extension in `chrome://extensions`.

**Tech stack**
- React 18 + TypeScript
- Vite + CRXJS (Chrome Extension plugin)
- Zustand (state management)
- Tailwind CSS
- Chrome MV3 (Side Panel API, Service Worker)

**Project structure**

```
src/
  background/
    index.ts                  Service worker, message router, intent classifier
    llm.ts                    API client with retry (chat, chatFast, chatEval, streaming)
    pipeline.ts               Skill compilation orchestrator (6 phases)
    phases/
      ingest.ts               File parsing and text extraction
      extract.ts              Parallel intent/steps/constraints extraction
      assemble.ts             Skill assembly + description optimization
      detect.ts               Tool detection from document context
      tool-schema.ts          Deterministic tool schema generation (OpenAI/Anthropic/OpenAPI)
      evaluate.ts             Eval set generation
      validate.ts             Blind A/B comparison validation loop
      prompt-optimizer.ts     Prompt optimization pipeline (optimize + eval + validate)
      agent-assembly.ts       Agent template generation
    prompts/
      intent.ts               Intent extraction prompt
      steps.ts                Workflow steps extraction prompt
      constraints.ts          Rules and constraints extraction prompt
      assembly.ts             Skill assembly prompt
      eval-gen.ts             Skill test case generation prompt (configurable count)
      grader.ts               Blind A/B comparison grading prompt
      improver.ts             Skill improvement prompt
      tool-detect.ts          Tool detection prompt
      agent-system.ts         Agent system prompt generation
      prompt-optimizer.ts     Prompt optimization prompt
      prompt-eval-gen.ts      Prompt test case generation prompt (configurable count)
      prompt-improver.ts      Prompt improvement prompt
  sidepanel/
    App.tsx                   Root layout, tab routing
    lib/
      types.ts                All TypeScript interfaces, Settings, message types
    stores/
      chatStore.ts            Messages, attached files, processing state
      compilationStore.ts     Phase, progress, skill/evals/validation, pipeline mode
    hooks/
      useCompilation.ts       Intent routing (compile/optimize/chat), send/cancel
      useBgMessage.ts         Background message listener, store updates
      useSettings.ts          Load/save settings via chrome.storage.local
    components/
      chat/                   ChatPanel, ChatMessage, ChatInput, FileChip, WelcomeScreen
      preview/                SkillPreview, SkillEditor, SkillToolbar
      evals/                  EvalDashboard, EvalCard, ScoreChart, IterationCompare
      tools/                  ToolsPanel — OpenAI/Anthropic/OpenAPI schema display
      agent/                  AgentPanel — system prompt + config export
      history/                HistoryList, HistoryCard
      settings/               SettingsPanel
      shared/                 ProgressStepper, CrabMascot, ErrorToast, EmptyState
```

---

## API Call Budget

The number of API calls depends on the pipeline and settings:

**Skill compilation** (worst case: all iterations run)
| Phase | Calls | Model |
|-------|-------|-------|
| Ingest | 0–1 | Strong (only for images) |
| Extract + Detect | 4 | Strong |
| Assemble | 2 | Strong + Fast |
| Generate evals | 1 | Eval/Fast |
| Validate (per iteration) | evalCount × 3 | Fast × 2 + Eval × 1 |
| Improve (per iteration) | 1 | Strong |
| Agent assembly | 1 | Strong |
| **Total (3 iter, 6 evals)** | **~65 calls** | |

**Prompt optimization** (worst case)
| Phase | Calls | Model |
|-------|-------|-------|
| Optimize | 1 | Strong |
| Generate evals | 1 | Eval/Fast |
| Validate (per iteration) | evalCount × 3 | Fast × 2 + Eval × 1 |
| Improve (per iteration) | 1 | Strong |
| **Total (3 iter, 6 evals)** | **~58 calls** | |

Reduce calls by lowering `evalCount` or `maxIterations` in Settings.

---

## Limitations

- **No backend.** All API calls go from the service worker to the configured endpoint. The endpoint must support CORS, or the extension needs `host_permissions` (already configured for all URLs).
- **File parsing runs in-browser.** PDF via pdf.js, DOCX via mammoth. Very large files may be slow.
- **Service worker lifetime.** Chrome MV3 can kill idle service workers after 30 seconds. The extension pings every 25 seconds during pipelines to prevent this. Long pipelines respond immediately and send results via message passing to avoid channel timeouts.
- **Eval quality depends on prompt clarity.** Test cases are generated by an LLM reading the prompt/skill. Vague inputs produce vague tests.
