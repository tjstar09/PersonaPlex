"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Trash2 } from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { usePersonaStore } from "@/store/usePersonaStore";
import type { Suggestion } from "@/types";
import { MessageBubble } from "./MessageBubble";

function addSuggestedPersona(s: Suggestion) {
  const state = usePersonaStore.getState();
  if (state.customPersonas.some((p) => p.name.toLowerCase() === s.name.toLowerCase()))
    return;
  const existing = [...state.personas, ...state.customPersonas].find(
    (p) => p.name.toLowerCase() === s.name.toLowerCase()
  );
  if (existing) {
    if (!state.activeIds.includes(existing.id)) {
      // respect tier guard: only auto-activate if under limit
      const limit = state.premiumUnlocked ? 10 : 3;
      if (state.activeIds.length < limit) state.toggleActive(existing.id);
    }
    return;
  }
  state.addCustomPersona({
    name: s.name,
    avatar: "🧩",
    tone: "Suggested by roster",
    systemPrompt: `You are ${s.name}. You joined this conversation because: ${s.reason}. Stay in character and contribute your unique perspective.`,
    expertiseTags: [s.reason.slice(0, 24)],
  });
}

export function ChatPanel() {
  const messages = useChatStore((s) => s.messages);
  const isEvaluatingHands = useChatStore((s) => s.isEvaluatingHands);
  const clearChat = useChatStore((s) => s.clearChat);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages.length, lastContent]);

  return (
    <div className="glass relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Radio size={15} className="text-accent-2" />
          Universal Chat & Debate Stage
        </div>
        <button
          onClick={clearChat}
          title="Clear conversation"
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs text-muted transition hover:bg-white/5 hover:text-foreground"
        >
          <Trash2 size={13} /> Clear
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && !isEvaluatingHands && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted">
            <div className="text-5xl">🎭</div>
            <p className="max-w-sm text-sm leading-relaxed">
              Activate personas on the left, then chat directly — or set a topic
              and launch a hand-raised multi-persona debate.
            </p>
            <p className="text-xs text-muted/70">
              Tip: type <code className="rounded bg-white/10 px-1">@</code> in the input to call out a persona mid-conversation.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onAddSuggestedPersona={addSuggestedPersona} />
          ))}
        </AnimatePresence>

        {isEvaluatingHands && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-surface-strong text-lg">
              🖐️
            </div>
            <div className="glass rounded-3xl rounded-tl-md px-4 py-3 text-sm text-muted">
              Personas are evaluating the floor… collecting hand-raises.
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
