import type { Suggestion } from "@/types";

const SUGGEST_RE =
  /\[SUGGEST_PERSONA:\s*["“]([^"”]+)["”]\s*,\s*["“]([^"”]+)["”]\s*\]/g;

export function extractSuggestions(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  for (const match of text.matchAll(SUGGEST_RE)) {
    const name = match[1].trim();
    const reason = match[2].trim();
    if (name && reason) out.push({ name, reason });
  }
  return out;
}

export function stripSuggestionTags(text: string): string {
  return text.replace(SUGGEST_RE, "").replace(/\n{3,}/g, "\n\n").trimEnd();
}
