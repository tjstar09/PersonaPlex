import { completeChat, type ChatCompletionMessage } from "./llm-client";
import { stripThinkBlocks } from "./thinking-filter";
import type { ApiConfig } from "@/types";

export interface PersonaDraft {
  name: string;
  avatar: string;
  tone: string;
  systemPrompt: string;
  expertiseTags: string[];
}

const ARCHITECT_SYSTEM = `You are a Persona Architect for a multi-persona AI chat app. The user gives you rough persona notes. You rewrite them into one vivid, focused character sheet.

Return ONLY strict JSON — no markdown fences, no commentary:
{"avatar": "single emoji", "name": "short name", "tone": "5-8 word tone summary", "systemPrompt": "...", "expertiseTags": ["3-4 short kebab-case tags"]}

The systemPrompt value MUST follow this exact four-line schema, each line prefixed:
WHO: one sentence defining the character.
DIGEST: what they notice/extract from any conversation first.
THINK: how they reason and what lens they apply.
OUTPUT: speaking style plus a hard word cap between 45 and 90 ("Max N words").

Keep the user's core idea. Make it specific, playable and non-generic. Total systemPrompt under 110 words.`;

/**
 * Rewrites rough persona notes into a structured character sheet using
 * the user's configured LLM endpoint.
 */
export async function enhancePersonaDraft(
  config: ApiConfig,
  draft: PersonaDraft,
  signal?: AbortSignal
): Promise<PersonaDraft> {
  const user = [
    `Name: ${draft.name || "(none)"}`,
    `Avatar idea: ${draft.avatar || "(none)"}`,
    `Tone: ${draft.tone || "(none)"}`,
    `Notes / draft prompt: ${draft.systemPrompt || "(none — invent from name/tone)"}`,
    `Existing tags: ${draft.expertiseTags.join(", ") || "(none)"}`,
  ].join("\n");

  const raw = await completeChat(
    config,
    [
      { role: "system", content: ARCHITECT_SYSTEM },
      { role: "user", content: user },
    ] satisfies ChatCompletionMessage[],
    signal
  );

  // Reasoning models may prepend plain-text or <think> chain-of-thought;
  // brace-scan the cleaned remainder for the JSON object.
  const cleaned = stripThinkBlocks(raw);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("Enhancer returned no JSON — try again or adjust the model");
  }
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<
    Record<keyof PersonaDraft, unknown>
  >;

  const tags = Array.isArray(parsed.expertiseTags)
    ? parsed.expertiseTags
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, 6)
    : [];

  return {
    avatar: typeof parsed.avatar === "string" && parsed.avatar.trim() ? parsed.avatar.trim().slice(0, 4) : draft.avatar || "🧩",
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : draft.name,
    tone: typeof parsed.tone === "string" && parsed.tone.trim() ? parsed.tone.trim() : draft.tone,
    systemPrompt:
      typeof parsed.systemPrompt === "string" && parsed.systemPrompt.trim()
        ? parsed.systemPrompt.trim()
        : draft.systemPrompt,
    expertiseTags: tags.length > 0 ? tags : draft.expertiseTags,
  };
}
