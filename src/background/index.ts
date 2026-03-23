import { compile, cancelCompilation } from './pipeline';
import { chatFast } from './llm';
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
  modelEval: '',
  maxIterations: 3,
  minScore: 0.85,
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
        .then(r => { stopKeepAlive(); sendResponse({ ok: true, data: r }); })
        .catch(e => { stopKeepAlive(); sendResponse({ ok: false, error: e.message }); });
      return true; // async

    case 'CHAT':
      (async () => {
        try {
          const reply = await chatFast({
            system: `You are Crab, a friendly assistant specialized in helping users create Agent Skills.

Your role: Have helpful conversations about skill creation. Do NOT create the skill yourself.

You can:
- Answer questions about what Agent Skills are
- Guide users on how to describe their process
- Explain what files to upload (PDF, DOCX, images of workflows)
- Chat naturally in Vietnamese or English
- Give feedback on user's business process descriptions
- Ask clarifying questions to help users prepare good input

You cannot:
- Actually compile or create the skill (the pipeline does that)
- Access external resources
- Run code

When the user is ready to create a skill, tell them:
"Bạn có thể gõ mô tả quy trình hoặc upload file PDF/DOCX, tôi sẽ tự động tạo skill cho bạn!"

Keep responses SHORT (2-4 sentences max). Be friendly and emoji-free.`,
            user: msg.data.message,
            temperature: 0.7,
          });
          sendResponse({ ok: true, reply });
        } catch (e: unknown) {
          sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
        }
      })();
      return true; // async

    case 'CANCEL':
      cancelCompilation();
      stopKeepAlive();
      sendResponse({ ok: true });
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
