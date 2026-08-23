"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Lightbulb, Plus, Zap } from "lucide-react";
import { usePersonaStore } from "@/store/usePersonaStore";
import type { Suggestion } from "@/types";

export type SuggestionState = "add" | "activate" | "joined";

export function useSuggestionState(suggestion: Suggestion): SuggestionState {
  return usePersonaStore((s) => {
    const all = [...s.personas, ...s.customPersonas];
    const existing = all.find(
      (p) => p.name.toLowerCase() === suggestion.name.toLowerCase()
    );
    if (!existing) return "add";
    return s.activeIds.includes(existing.id) ? "joined" : "activate";
  });
}

export function SuggestionCard({
  suggestion,
  onAction,
}: {
  suggestion: Suggestion;
  onAction: (s: Suggestion) => void;
}) {
  const state = useSuggestionState(suggestion);

  if (state === "joined") {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2"
      >
        <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
        <span className="text-xs text-muted">
          <strong className="font-medium text-foreground/90">{suggestion.name}</strong>{" "}
          joined the conversation
        </span>
      </motion.div>
    );
  }

  const activating = state === "activate";
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onAction(suggestion)}
      className={`mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed px-3 py-2.5 text-left transition hover:shadow-[var(--glow-accent)] ${
        activating
          ? "border-accent-2/50 bg-cyan-400/10 hover:border-accent-2"
          : "border-accent/50 bg-accent-soft hover:border-accent"
      }`}
    >
      {activating ? (
        <Zap size={18} className="shrink-0 text-accent-2" />
      ) : (
        <Lightbulb size={18} className="shrink-0" style={{ color: "#fbbf24" }} />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {activating ? "Activate " : "Add suggested persona: "}
          {suggestion.name}
        </span>
        <span className="block truncate text-xs text-muted">{suggestion.reason}</span>
      </span>
      <Plus
        size={16}
        className={`shrink-0 ${activating ? "text-accent-2" : "text-accent"}`}
      />
    </motion.button>
  );
}
