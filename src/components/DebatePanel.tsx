"use client";

import { motion } from "framer-motion";
import { Flame, Hand, MicVocal, Play, Square, Swords } from "lucide-react";
import { getPersonaById, usePersonaStore } from "@/store/usePersonaStore";
import { useChatStore } from "@/store/useChatStore";
import {
  MODERATOR_ACTIONS,
  type DebateTone,
} from "@/lib/debate-orchestrator";
import type { HandRaise } from "@/types";
const TONES: { id: DebateTone; label: string; icon: typeof Flame }[] = [
  { id: "peaceful", label: "Peaceful", icon: Flame },
  { id: "standard", label: "Standard", icon: Swords },
  { id: "extreme", label: "Extreme", icon: Flame },
];

function toneIcon(tone: DebateTone) {
  if (tone === "peaceful") return "🕊️";
  if (tone === "standard") return "⚔️";
  return "🔥";
}

export function DebatePanel() {
  const topic = useChatStore((s) => s.topic);
  const setTopic = useChatStore((s) => s.setTopic);
  const tone = useChatStore((s) => s.tone);
  const setTone = useChatStore((s) => s.setTone);
  const startDebate = useChatStore((s) => s.startDebate);
  const stop = useChatStore((s) => s.stop);
  const isBusy = useChatStore((s) => s.isBusy);
  const isEvaluatingHands = useChatStore((s) => s.isEvaluatingHands);
  const handRaises = useChatStore((s) => s.handRaises);
  const queueOrder = useChatStore((s) => s.queueOrder);

  const raisedHands = [...handRaises]
    .filter((h) => h.wantsToSpeak)
    .sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MicVocal size={15} className="text-accent" />
        Topic Controller
      </div>

      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={2}
        placeholder="Debate topic — e.g. 'Should remote work become the default?'"
        disabled={isBusy}
        className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50"
      />

      <div>
        <div className="mb-1.5 text-[0.7rem] uppercase tracking-wider text-muted">
          Tone Directive
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {TONES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              disabled={isBusy}
              className={`rounded-xl border px-2 py-2 text-xs transition disabled:opacity-50 ${
                tone === t.id
                  ? "border-accent bg-accent-soft text-foreground"
                  : "border-line text-muted hover:border-line-strong hover:text-foreground"
              }`}
              title={
                t.id === "peaceful"
                  ? "Collaborative, acknowledge others"
                  : t.id === "standard"
                    ? "Critical but respectful debate"
                    : "Aggressive rhetorical combat"
              }
            >
              <span className="mr-1">{toneIcon(t.id)}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={startDebate}
          disabled={isBusy}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-40"
          style={{ boxShadow: "var(--glow-accent)" }}
        >
          <Play size={14} /> Launch Debate
        </button>
        <button
          onClick={stop}
          disabled={!isBusy}
          title="Stop streams"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-danger/50 px-3 text-sm text-danger transition hover:bg-danger/10 disabled:opacity-30"
        >
          <Square size={13} /> Stop
        </button>
      </div>

      <ModeratorBar canDebate={topic.trim().length > 0} isBusy={isBusy} />

      {(isEvaluatingHands || handRaises.length > 0) && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wider text-muted">
            <Hand size={12} /> Hand-Raise Queue
          </div>
          {isEvaluatingHands ? (
            <div className="rounded-xl border border-line px-3 py-2 text-xs text-muted">
              🖐️ Personas evaluating relevance concurrently…
            </div>
          ) : (
            <div className="space-y-1.5">
              {raisedHands.map((h) => (
                <HandRaiseBar key={h.personaId} raise={h} queued={queueOrder.includes(h.personaId)} />
              ))}
              {raisedHands.length === 0 && (
                <div className="rounded-xl border border-line px-3 py-2 text-xs text-muted">
                  No hands raised in the last evaluation.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModeratorBar({ canDebate, isBusy }: { canDebate: boolean; isBusy: boolean }) {
  const moderate = useChatStore((s) => s.moderate);
  const activeCount = usePersonaStore((s) => s.activeIds.length);
  const enabled = canDebate && activeCount >= 2 && !isBusy;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wider text-muted">
        <MicVocal size={12} /> Moderator Controls
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {MODERATOR_ACTIONS.map(({ action, emoji, label }) => (
          <button
            key={action}
            onClick={() => void moderate(action)}
            disabled={!enabled}
            title={`Moderator: ${label}`}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-line px-1 py-1.5 text-[0.62rem] text-muted transition hover:border-accent/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
          >
            <span className="text-sm">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HandRaiseBar({ raise, queued }: { raise: HandRaise; queued: boolean }) {
  const persona = getPersonaById(raise.personaId);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border px-3 py-2 ${
        queued ? "border-accent/60 bg-accent-soft" : "border-line"
      }`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-medium ${queued ? "" : "text-muted"}`}>
          <span className={`text-base ${queued ? "hand-raised inline-block" : ""}`}>🖐️</span>
          {persona?.avatar} {persona?.name ?? "Unknown"}
          {queued && (
            <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[0.6rem] text-white">
              QUEUED
            </span>
          )}
        </span>
        <span className="text-accent-2">{Math.round(raise.confidence * 100)}%</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all"
          style={{ width: `${Math.round(raise.confidence * 100)}%` }}
        />
      </div>
      {raise.snippet && (
        <div className="mt-1 truncate text-[0.68rem] text-muted">“{raise.snippet}”</div>
      )}
    </motion.div>
  );
}
