import type { ApiConfig } from "@/types";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function endpoint(config: ApiConfig): string {
  return `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;
}

async function requestChatCompletion(
  config: ApiConfig,
  messages: ChatCompletionMessage[],
  stream: boolean,
  signal?: AbortSignal
): Promise<Response> {
  const res = await fetch(endpoint(config), {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
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

export async function* streamChatCompletion(
  config: ApiConfig,
  messages: ChatCompletionMessage[],
  signal?: AbortSignal
): AsyncGenerator<string> {
  const res = await requestChatCompletion(config, messages, true, signal);
  if (!res.body) throw new Error("Response has no body stream");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore keep-alive / malformed fragments
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
