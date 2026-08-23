"use client";

import { motion } from "framer-motion";
import { getPersonaById } from "@/store/usePersonaStore";
import type { ChatMessage, Suggestion } from "@/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SuggestionCard } from "./SuggestionCard";

export function MessageBubble({
  message,
  onAddSuggestedPersona,
}: {
  message: ChatMessage;
  onAddSuggestedPersona: (s: Suggestion) => void;
}) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-3xl rounded-br-md bg-accent px-4 py-2.5 text-[0.92rem] text-white shadow-lg">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const persona = getPersonaById(message.personaId ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-strong text-lg">
        {persona?.avatar ?? "🤖"}
      </div>
      <div className="min-w-0 max-w-[85%]">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="font-semibold text-foreground/90">{persona?.name ?? "System"}</span>
          {message.streaming && (
            <span className="flex items-center gap-1 text-accent-2">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent-2" />
              streaming…
            </span>
          )}
        </div>
        <div
          className={`glass rounded-3xl rounded-tl-md px-4 py-3 ${
            message.streaming ? "stream-caret" : ""
          }`}
        >
          <MarkdownRenderer content={message.content || "…"} />
        </div>
        {message.suggestions?.map((s, i) => (
          <SuggestionCard key={i} suggestion={s} onAdd={onAddSuggestedPersona} />
        ))}
      </div>
    </motion.div>
  );
}
