# Crab Create Skills

A Chrome extension that converts business documents and process descriptions into production-ready Agent Skills. Upload a PDF, DOCX, or describe your workflow in chat — Crab runs a 5-phase pipeline and outputs a validated SKILL.md ready to deploy.

---

## What it does

You provide raw input: a process document, a workflow screenshot, or a plain-text description. Crab extracts the business logic, assembles it into a structured skill, generates test cases, and iteratively validates the skill against a baseline — all inside the extension, no backend required.

The output is a `SKILL.md` file conforming to the [Agent Skills specification](https://agentskills.io/specification), with a score showing how much better the skill performs compared to a model with no skill loaded.

---

## Pipeline

The compilation runs 5 sequential phases:

**Phase 1 — Ingest**
Parses uploaded files (PDF, DOCX, images, plain text) and combines them with any user-provided description into a single document context.

**Phase 2 — Extract**
Three parallel extractions using the strong model:
- Intent: skill name, type, domain, target user
- Steps: ordered workflow with inputs, outputs, conditions, error handling
- Constraints: hard rules, soft rules, edge cases, permissions, validations

**Phase 3 — Assemble**
The strong model synthesizes the extracted data into a complete `SKILL.md` with YAML frontmatter. A second pass using the fast model rewrites the `description` field to improve triggering accuracy — making Claude more likely to invoke the skill in the right contexts.

**Phase 4 — Evaluate**
The eval model generates a test set:
- 14 trigger evals (8 should-trigger, 6 should-not-trigger near-misses)
- 4 functional evals with plain-string assertions (2 happy path, 2 edge cases)

**Phase 5 — Validate**
Iterative blind comparison loop:
1. Run the eval prompt with the skill loaded (fast model)
2. Run the same prompt without the skill as a baseline (fast model)
3. Blind comparison: the eval model scores both outputs as A/B without knowing which used the skill
4. If score is below `minScore`, the strong model rewrites the skill based on failures
5. Repeat up to `maxIterations` times, keeping the best version

---

## Model roles

The extension separates work across three configurable models to avoid using expensive models for tasks that don't require them:

| Model | Used for |
|-------|----------|
| Strong | Extract intent/steps/constraints, assemble skill, improve skill on failures |
| Fast | Chat replies, with-skill execution, without-skill baseline execution, description optimization |
| Eval | Generate test cases, blind comparison grading (falls back to Fast if not set) |

---

## Setup

**Requirements**
- Chrome 114 or later (Side Panel API)
- An OpenAI-compatible API endpoint

**Install**
1. Clone the repository
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Open `chrome://extensions`, enable Developer Mode
5. Click "Load unpacked" and select the `dist/` folder
6. Click the Crab icon in the toolbar to open the side panel

**Configure**
Open the Settings tab and fill in:
- Base URL — your API endpoint, e.g. `https://api.openai.com/v1`
- API Key — your API key
- Strong Model — model name for skill creation, e.g. `gpt-4o`
- Fast Model — model name for chat and execution, e.g. `gpt-4o-mini`
- Eval Model — model for grading and test generation (optional, falls back to Fast Model)

No defaults are pre-filled. The extension will show an error toast and block compilation if required settings are missing.

---

## Development

```
npm run dev      # Start Vite dev server with HMR
npm run build    # Production build to dist/
```

After any build, reload the extension in `chrome://extensions` by clicking the refresh icon.

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
    index.ts              Service worker, message router
    llm.ts                API client (chat, chatFast, chatEval, streaming)
    pipeline.ts           Main compilation orchestrator
    phases/
      ingest.ts           File parsing and text extraction
      extract.ts          Parallel intent/steps/constraints extraction
      assemble.ts         Skill assembly + description optimization
      evaluate.ts         Eval set generation
      validate.ts         Blind comparison validation loop
    prompts/
      intent.ts           Intent extraction prompt
      steps.ts            Workflow steps extraction prompt
      constraints.ts      Rules and constraints extraction prompt
      assembly.ts         Skill assembly prompt
      eval-gen.ts         Test case generation prompt
      grader.ts           Blind comparison grading prompt
      improver.ts         Skill improvement prompt
  sidepanel/
    App.tsx               Root layout, tab routing, error toast
    components/
      chat/               ChatPanel, ChatMessage, ChatInput, FileChip, WelcomeScreen
      preview/            SkillPreview — rendered SKILL.md output
      evals/              EvalDashboard — test results and scores
      history/            HistoryList — past compiled skills
      settings/           SettingsPanel — API configuration
      shared/             ProgressStepper, CrabMascot, ErrorToast
    stores/
      chatStore.ts        Messages, attached files, processing state
      compilationStore.ts Phase, progress, skill/evals/validation output
      settingsStore.ts    API settings with chrome.storage.local persistence
    hooks/
      useCompilation.ts   Send/cancel compilation, chat routing logic
      useBgMessage.ts     Background message listener, store updates
      useSettings.ts      Load/save settings
```

---

## Error handling

The extension surfaces errors as a toast notification at the top of the panel with a 7-second auto-dismiss timer. Common errors are parsed into plain-language messages:

| Error | Displayed as |
|-------|-------------|
| 401 / authentication failure | API Key is invalid |
| Network / fetch failure | Cannot connect to API |
| Model not configured | Model name missing in Settings |
| 429 / rate limit | Rate limit exceeded |
| JSON parse failure | Model returned invalid data |
| Missing settings on send | Blocks compilation, prompts to open Settings |

Clicking "Open Settings" in the toast navigates directly to the Settings tab.

---

## Limitations

- No backend. All API calls go directly from the service worker to the configured endpoint, so the endpoint must support CORS or be a local server.
- The validation loop makes many API calls (2 executions + 1 grading call per eval per iteration). With 4 evals and 3 iterations that is up to 36 calls. Keep this in mind when choosing models.
- File parsing runs in the browser. PDF text extraction uses pdf.js. DOCX extraction uses mammoth. Very large files may be slow.
- The service worker keep-alive pings Chrome every 25 seconds during compilation to prevent the 30-second idle timeout from killing a long pipeline run.
