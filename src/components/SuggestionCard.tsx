"use client";

import { Lightbulb, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { Suggestion } from "@/types";

export function SuggestionCard({
  suggestion,
  onAdd,
}: {
  suggestion: Suggestion;
  onAdd: (s: Suggestion) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onAdd(suggestion)}
      className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent/50 bg-accent-soft px-3 py-2.5 text-left transition hover:border-accent hover:shadow-[var(--glow-accent)]"
    >
      <Lightbulb size={18} className="shrink-0 text-warning" style={{ color: "#fbbf24" }} />
      <span className="flex-1 min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          Add suggested persona: {suggestion.name}
        </span>
        <span className="block truncate text-xs text-muted">{suggestion.reason}</span>
      </span>
      <Plus size={16} className="shrink-0 text-accent" />
    </motion.button>
  );
}
