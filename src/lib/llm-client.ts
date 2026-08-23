import type { ApiConfig } from "@/types";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamDelta {
  /** Visible answer tokens. */
  content?: string;
  /** Reasoning-model chain-of-thought tokens (hidden from chat UI). */
  reasoning?: string;
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function endpoint(config: ApiConfig): string {
  return `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;
}

const RETRY_DELAYS_MS = [800, 2000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with automatic retry on transient failures: network errors,
 * HTTP 429 (rate limit) and 5xx. Aborts propagate immediately.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit & { signal?: AbortSignal }
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (
        (res.status === 429 || res.status >= 500) &&
        attempt < RETRY_DELAYS_MS.length
      ) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      return res;
    } catch (err) {
      if (init.signal?.aborted) throw err;
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw err;
    }
  }
}

async function requestChatCompletion(
  config: ApiConfig,
  messages: ChatCompletionMessage[],
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  const res = await fetchWithRetry(endpoint(config), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: stream ? "text/event-stream" : "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(normalizeBaseUrl(config.baseUrl).includes("openrouter")
        ? { "HTTP-Referer": "https://personaplex.local", "X-Title": "PersonaPlex" }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: 0.8,
      stream,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  return res;
}

interface DeltaShape {
  content?: string;
  reasoning?: string;
  reasoning_content?: string;
}

/**
 * Streams a chat completion as structured deltas. Providers that ignore
 * `stream:true` (proxies, some gateways) are handled gracefully: the whole
 * JSON payload is parsed and emitted as a single content delta.
 */
export async function* streamChatCompletion(
  config: ApiConfig,
  messages: ChatCompletionMessage[],
  signal?: AbortSignal
): AsyncGenerator<StreamDelta> {
  const res = await requestChatCompletion(config, messages, true, signal);
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.body || contentType.includes("application/json")) {
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (json.error?.message) throw new Error(`LLM error: ${json.error.message}`);
    yield { content: json.choices?.[0]?.message?.content ?? "" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: DeltaShape }[];
          error?: { message?: string };
        };
        if (json.error?.message) throw new Error(`LLM error: ${json.error.message}`);
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        const reasoning = delta.reasoning_content ?? delta.reasoning;
        if (reasoning) yield { reasoning };
        if (delta.content) yield { content: delta.content };
      } catch (err) {
        if (err instanceof SyntaxError) continue; // keep-alive / malformed fragment
        throw err;
      }
    }
  }
}

export async function completeChat(
  config: ApiConfig,
  messages: ChatCompletionMessage[],
  signal?: AbortSignal
): Promise<string> {
  const res = await requestChatCompletion(config, messages, false, signal);
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return json.choices?.[0]?.message?.content ?? "";
}
