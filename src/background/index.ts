import { compile, cancelCompilation } from './pipeline';
import { chatWithHistory } from './llm';
import { optimizePipeline, cancelOptimize } from './phases/prompt-optimizer';
import type { Settings } from '../sidepanel/lib/types';

// Open side panel on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Default settings
const DEFAULTS: Settings = {
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

// Init default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) {
    await chrome.storage.local.set({ settings: DEFAULTS });
  }
});

// Keep service worker alive during long operations
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

function startKeepAlive() {
  if (keepAliveInterval) return;
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {});
  }, 25000); // ping every 25s to prevent 30s idle timeout
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

// Message handler
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'COMPILE':
      startKeepAlive();
      compile(msg.data.files, msg.data.userMessage)
        .then(() => stopKeepAlive())
        .catch(e => { stopKeepAlive(); chrome.runtime.sendMessage({ type: 'ERROR', error: e.message }).catch(() => {}); });
      sendResponse({ ok: true }); // respond immediately, results via PROGRESS/DONE messages
      break;

    case 'CHAT':
      (async () => {
        try {
          const context: string = msg.data.context || '';
          const history: { role: 'user' | 'assistant'; content: string }[] = msg.data.history || [];

          // Ensure history ends with the current user message
          const lastMsg = history[history.length - 1];
          const fullHistory = (lastMsg?.role === 'user' && lastMsg?.content === msg.data.message)
            ? history
            : [...history, { role: 'user' as const, content: msg.data.message }];

          const reply = await chatWithHistory({
            system: `You are Crab, a friendly assistant specialized in helping users create Agent Skills.

Your role: Have helpful conversations about skill creation, answer questions about the current compilation result, and guide users.${context ? `\n\n${context}` : ''}

You can:
- Explain the current skill, tools, agent template that was just compiled
- Answer questions about what was detected (tools, steps, constraints)
- Guide users to the right tab (Preview, Tools, Agent, Evals) to see results
- Explain WHY no tools were detected if asked (pure reasoning skills don't need external APIs)
- Help users understand what to do next with the output
- Chat naturally in Vietnamese or English

About tools: Tools are only generated when the workflow requires calling external systems (APIs, databases, services). A skill about creating DOCX files is a pure reasoning/generation task — the AI does it directly without calling any external API, so 0 tools is correct. If the user wants tools, they need a workflow that involves external systems (e.g. "fetch customer data from CRM, then create invoice").

Keep responses SHORT and direct (2-4 sentences). Be friendly and emoji-free.`,
            history: fullHistory,
            temperature: 0.7,
          });
          sendResponse({ ok: true, reply });
        } catch (e: unknown) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
        }
      })();
      return true; // async

    case 'CLASSIFY':
      (async () => {
        try {
          const msg_text: string = msg.data.message || '';
          const reply = await chatWithHistory({
            system: `You are a router. Classify the user's message into exactly one of three intents: COMPILE, OPTIMIZE, or CHAT.

OPTIMIZE = the user wants to improve, fix, rewrite, or optimize an EXISTING skill/prompt/description. Keywords: "tối ưu", "optimize", "cải thiện", "sửa", "improve", "rewrite", "fix prompt", "tối ưu prompt", "optimize prompt", "optimize skill", "cải thiện skill", "sửa prompt". The user is asking to make an existing thing better — NOT create something new.

COMPILE = the user wants to CREATE something brand new: a skill, tool, function schema, agent, workflow, API definition, process document. Any request to build/generate/create/make something new counts.

CHAT = the user is asking a question, chatting, saying hello, asking for explanation, or doing anything that is NOT a create/build/optimize request.

Priority: if the message mentions optimizing/improving a prompt or skill → OPTIMIZE (even if it also describes a workflow).
When in doubt between COMPILE and CHAT → choose COMPILE.
When in doubt between OPTIMIZE and COMPILE → choose OPTIMIZE if there's any mention of fixing/improving existing content.

Reply with ONLY a single JSON object: {"intent": "compile"} or {"intent": "optimize"} or {"intent": "chat"}`,
            history: [{ role: 'user', content: msg_text }],
            temperature: 0,
          });
          try {
            const parsed = JSON.parse(reply.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''));
            const intent = parsed.intent ?? (parsed.compile === true ? 'compile' : 'chat');
            sendResponse({ compile: intent === 'compile', optimize: intent === 'optimize' });
          } catch {
            sendResponse({ compile: true, optimize: false });
          }
        } catch {
          sendResponse({ compile: true, optimize: false });
        }
      })();
      return true; // async

    case 'CANCEL':
      cancelCompilation();
      cancelOptimize();
      stopKeepAlive();
      sendResponse({ ok: true });
      break;

    case 'OPTIMIZE_PROMPT':
      startKeepAlive();
      optimizePipeline(msg.data.skillContent)
        .then(() => stopKeepAlive())
        .catch(e => { stopKeepAlive(); chrome.runtime.sendMessage({ type: 'ERROR', error: e.message }).catch(() => {}); });
      sendResponse({ ok: true }); // respond immediately, results via PROGRESS/DONE messages
      break;

    case 'GET_SETTINGS':
      chrome.storage.local.get('settings', (d) => {
        sendResponse(d.settings || DEFAULTS);
      });
      return true; // async

    case 'SAVE_SETTINGS':
      chrome.storage.local.set({ settings: msg.data }, () => {
        sendResponse({ ok: true });
      });
      return true; // async
  }
});
