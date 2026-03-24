import type { Settings } from '../sidepanel/lib/types';

const DEFAULT_SETTINGS: Settings = {
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

let cachedSettings: Settings | null = null;

async function getSettings(): Promise<Settings> {
  if (cachedSettings) return cachedSettings;
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (data) => {
      cachedSettings = data.settings || DEFAULT_SETTINGS;
      resolve(cachedSettings!);
    });
  });
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) cachedSettings = changes.settings.newValue;
});

function isAnthropic(s: Settings): boolean {
  return s.provider === 'anthropic' || s.baseUrl.includes('api.anthropic.com');
}

/**
 * Returns true for models that use the newer OpenAI "reasoning" API:
 * - o-series (o1, o3, o4-mini…)
 * - gpt-5.x and later (gpt-5, gpt-5.2, gpt-5-turbo…)
 * These models require max_completion_tokens instead of max_tokens,
 * and do NOT accept a temperature parameter.
 */
function isReasoningModel(model: string): boolean {
  return /^(o\d|gpt-5)/i.test(model);
}

/**
 * Build the token-limit param for OpenAI-compatible calls.
 * Reasoning models use max_completion_tokens; legacy models use max_tokens.
 */
function maxTokensParam(model: string, value: number): Record<string, number> {
  return isReasoningModel(model) ? { max_completion_tokens: value } : { max_tokens: value };
}

/**
 * Build the temperature param for OpenAI-compatible calls.
 * Reasoning models (o-series, gpt-5.x) do not accept temperature — omit it.
 */
function temperatureParam(model: string, value: number): Record<string, number> {
  return isReasoningModel(model) ? {} : { temperature: value };
}

/**
 * Retry with exponential backoff for transient errors (429, 500, 502, 503, 504).
 */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const status = Number(lastErr.message.match(/API (\d+)/)?.[1] || 0);
      if (!RETRYABLE.has(status) || attempt === MAX_RETRIES) throw lastErr;
      const delay = Math.min(1000 * 2 ** attempt, 8000); // 1s, 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr!;
}

/**
 * Low-level fetch helper. Handles both OpenAI-compatible and Anthropic APIs.
 */
async function fetchChat(opts: {
  system: string;
  user: string;
  model: string;
  temperature?: number;
}): Promise<string> {
  return withRetry(async () => {
    const s = await getSettings();

    if (isAnthropic(s)) {
      // Anthropic Messages API
      const baseUrl = s.baseUrl || 'https://api.anthropic.com';
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: opts.model,
          system: opts.system,
          messages: [{ role: 'user', content: opts.user }],
          temperature: opts.temperature ?? 0.3,
          max_tokens: 4096,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    // OpenAI-compatible
    const res = await fetch(`${s.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: opts.model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        ...temperatureParam(opts.model, opts.temperature ?? 0.3),
        ...maxTokensParam(opts.model, 4096),
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  });
}

/**
 * Multi-turn chat with history. Used for the chat panel conversation.
 */
export async function chatWithHistory(opts: {
  system: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  temperature?: number;
}): Promise<string> {
  return withRetry(async () => {
    const s = await getSettings();
    const model = s.modelFast;

    if (isAnthropic(s)) {
      const baseUrl = s.baseUrl || 'https://api.anthropic.com';
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: opts.system,
          messages: opts.history,
          temperature: opts.temperature ?? 0.7,
          max_tokens: 1024,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    const res = await fetch(`${s.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: opts.system },
          ...opts.history,
        ],
        ...temperatureParam(model, opts.temperature ?? 0.7),
        ...maxTokensParam(model, 1024),
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  });
}


export async function chat(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const s = await getSettings();
  return fetchChat({ ...opts, model: opts.model || s.modelStrong });
}

/**
 * Call fast/weak model (grading, baseline execution, chat replies).
 */
export async function chatFast(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const s = await getSettings();
  return fetchChat({ ...opts, model: opts.model || s.modelFast });
}

/**
 * Call LLM with image (vision/multimodal).
 */
export async function chatWithImage(opts: {
  prompt: string;
  imageBase64: string;
  mimeType?: string;
  model?: string;
}): Promise<string> {
  return withRetry(async () => {
    const s = await getSettings();
    const mimeType = opts.mimeType || 'image/png';

    if (isAnthropic(s)) {
      const baseUrl = s.baseUrl || 'https://api.anthropic.com';
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: opts.model || s.modelStrong,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mimeType, data: opts.imageBase64 } },
              { type: 'text', text: opts.prompt },
            ],
          }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    const imgModel = opts.model || s.modelStrong;
    const res = await fetch(`${s.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: imgModel,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${opts.imageBase64}` } },
            { type: 'text', text: opts.prompt },
          ],
        }],
        ...temperatureParam(imgModel, 0.3),
        ...maxTokensParam(imgModel, 4096),
      }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  });
}

/**
 * Call LLM, parse JSON response. Retry once on failure.
 */
export async function chatJSON<T>(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const raw = await chat({
    ...opts,
    system: opts.system + '\n\nReturn ONLY valid JSON. No markdown fences, no explanation.',
  });
  try {
    return parseJSON<T>(raw);
  } catch {
    // Retry once
    const raw2 = await chat({
      ...opts,
      system: opts.system + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation, no text before or after the JSON.',
    });
    return parseJSON<T>(raw2);
  }
}

function parseJSON<T>(text: string): T {
  let clean = text.trim();
  if (clean.startsWith('```')) clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(clean);
}

/**
 * Call fast model, parse JSON response. For grading & baseline tasks.
 */
export async function chatJSONFast<T>(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const raw = await chatFast({
    ...opts,
    system: opts.system + '\n\nReturn ONLY valid JSON. No markdown fences, no explanation.',
  });
  try {
    return parseJSON<T>(raw);
  } catch {
    const raw2 = await chatFast({
      ...opts,
      system: opts.system + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation, no text before or after the JSON.',
    });
    return parseJSON<T>(raw2);
  }
}

/**
 * Call eval model (eval generation + grading). Falls back to fast model if not set.
 */
export async function chatEval(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const s = await getSettings();
  return fetchChat({ ...opts, model: opts.model || s.modelFast });
}

/**
 * Call eval model, parse JSON. For eval generation & grading.
 */
export async function chatJSONEval<T>(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const raw = await chatEval({
    ...opts,
    system: opts.system + '\n\nReturn ONLY valid JSON. No markdown fences, no explanation.',
  });
  try {
    return parseJSON<T>(raw);
  } catch {
    const raw2 = await chatEval({
      ...opts,
      system: opts.system + '\n\nIMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation, no text before or after the JSON.',
    });
    return parseJSON<T>(raw2);
  }
}

/**
 * Call LLM with streaming. Returns full text, sends chunks via callback.
 * Handles both OpenAI SSE format and Anthropic SSE format.
 */
export async function chatStream(opts: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  onChunk: (delta: string, full: string) => void;
}): Promise<string> {
  const s = await getSettings();

  let res: Response;

  if (isAnthropic(s)) {
    const baseUrl = s.baseUrl || 'https://api.anthropic.com';
    res = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': s.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: opts.model || s.modelStrong,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
        temperature: opts.temperature ?? 0.3,
        max_tokens: 4096,
        stream: true,
      }),
    });
  } else {
    const streamModel = opts.model || s.modelStrong;
    res = await fetch(`${s.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: streamModel,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        ...temperatureParam(streamModel, opts.temperature ?? 0.3),
        ...maxTokensParam(streamModel, 4096),
        stream: true,
      }),
    });
  }

  if (!res.ok) throw new Error(`API ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const d = line.slice(6).trim();
      if (d === '[DONE]') continue;
      try {
        const parsed = JSON.parse(d);
        // Anthropic: event type content_block_delta
        const delta =
          parsed.delta?.text ||                           // Anthropic streaming
          parsed.choices?.[0]?.delta?.content ||          // OpenAI streaming
          '';
        if (delta) { full += delta; opts.onChunk(delta, full); }
      } catch { /* skip */ }
    }
  }
  return full;
}
