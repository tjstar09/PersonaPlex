import type { Suggestion } from "@/types";

const SUGGEST_RE =
  /\[SUGGEST_PERSONA:\s*["“]([^"”]+)["”]\s*,\s*["“]([^"”]+)["”]\s*\]/g;

const PLACEHOLDER_NAMES = new Set([
  "suggested name",
  "name",
  "persona name",
  "role",
  "example",
  "legal specialist", // the example used in the prompt template
]);

const PLACEHOLDER_REASON_PATTERNS = [
  /^one[- ]sentence reason/i,
  /^reason$/i,
  /^why they should join/i,
  /liability angles keep coming up unchecked/i, // the prompt's example
  /^\W*$/,
];

function isPlaceholder(s: Suggestion): boolean {
  if (PLACEHOLDER_NAMES.has(s.name.toLowerCase().trim())) return true;
  if (s.name.toLowerCase().includes("suggested name")) return true;
  return PLACEHOLDER_REASON_PATTERNS.some((re) => re.test(s.reason.trim()));
}

export function extractSuggestions(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  for (const match of text.matchAll(SUGGEST_RE)) {
    const name = match[1].trim();
    const reason = match[2].trim();
    if (name && reason) out.push({ name, reason });
  }
  return out.filter((s) => !isPlaceholder(s));
}

export function stripSuggestionTags(text: string): string {
  return text.replace(SUGGEST_RE, "").replace(/\n{3,}/g, "\n\n").trimEnd();
}
