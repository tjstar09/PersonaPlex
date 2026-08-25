"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Radio, Trash2 } from "lucide-react";
import { getPersonaById, usePersonaStore } from "@/store/usePersonaStore";
import { useChatStore } from "@/store/useChatStore";
import {
  buildJsonExport,
  buildMarkdownClean,
  buildMarkdownTranscript,
  buildPrintHtml,
  downloadText,
  exportFilename,
  openPrintWindow,
  type ExportInput,
  type ExportOptions,
} from "@/lib/export-transcript";
import { MessageBubble } from "./MessageBubble";
import type { Suggestion } from "@/types";

const DEFAULT_OPTIONS: ExportOptions = {
  includeTimestamps: true,
  includeHandRaises: true,
  includePersonaInstructions: false,
};

/**
 * Resolve a suggestion card click: add missing personas (auto-activated),
 * activate existing inactive ones, or route to the upgrade flow at the cap.
 * Joins are announced in-chat as UI event lines.
 */
function resolveSuggestion(s: Suggestion) {
  const chat = useChatStore.getState();
  const state = usePersonaStore.getState();
  const limit = state.premiumUnlocked ? 10 : 3;

  const existing = [...state.personas, ...state.customPersonas].find(
    (p) => p.name.toLowerCase() === s.name.toLowerCase()
  );

  if (!existing) {
    if (state.activeIds.length >= limit) {
      state.setPendingUpgrade(true);
      return;
    }
    const created = state.addCustomPersona({
      name: s.name,
      avatar: "🧩",
      tone: "Suggested by roster",
      systemPrompt: `You are ${s.name}. You joined this conversation because: ${s.reason}. Stay in character and contribute your unique perspective.`,
      expertiseTags: [s.reason.slice(0, 24)],
    });
    state.toggleActive(created.id);
    chat.pushEvent(`✨ ${created.name} joined the conversation`);
    return;
  }

  if (state.activeIds.includes(existing.id)) return; // already speaking

  if (state.activeIds.length >= limit) {
    state.setPendingUpgrade(true);
    return;
  }
  state.toggleActive(existing.id);
  chat.pushEvent(`✨ ${existing.name} joined the conversation`);
}

function buildExportInput(): ExportInput {
  const { messages, topic, tone, handRaises } = useChatStore.getState();
  const options = { ...DEFAULT_OPTIONS };

  const ids = new Set(
    messages.map((m) => m.personaId).filter((id): id is string => Boolean(id) && id !== "__moderator__")
  );
  let personas = [...ids]
    .map((id) => getPersonaById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (personas.length === 0) {
    personas = usePersonaStore
      .getState()
      .activeIds.map(getPersonaById)
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }

  const isDebate =
    handRaises.length > 0 ||
    messages.some(
      (m) => m.personaId === "__moderator__" || m.content.startsWith("🎤 Debate topic:")
    );

  return {
    messages,
    personas,
    topic,
    tone,
    mode: isDebate ? "debate" : "chat",
    handRaises,
    exportedAt: new Date(),
    options,
  };
}

function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_OPTIONS);
  const wrapRef = useRef<HTMLDivElement>(null);
  const messageCount = useChatStore((s) => s.messages.length);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function withOptions(fn: (input: ExportInput) => void) {
    const input = { ...buildExportInput(), options };
    fn(input);
    setOpen(false);
  }

  const disabled = messageCount === 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={disabled ? "Nothing to export yet" : "Export conversation"}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs text-muted transition hover:bg-white/5 hover:text-foreground disabled:opacity-40"
      >
        <Download size={13} /> Export
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="glass-strong absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-2xl p-1"
          >
            <button
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5"
              onClick={() =>
                withOptions((input) =>
                  downloadText(
                    exportFilename(input.mode, "md"),
                    buildMarkdownTranscript(input),
                    "text/markdown;charset=utf-8"
                  )
                )
              }
            >
              📝 Markdown — full
              <span className="block text-[0.65rem] text-muted">participants · verdict · appendices</span>
            </button>
            <button
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5"
              onClick={() =>
                withOptions((input) =>
                  downloadText(
                    exportFilename(input.mode, "md"),
                    buildMarkdownClean(input),
                    "text/markdown;charset=utf-8"
                  )
                )
              }
            >
              📄 Markdown — clean
              <span className="block text-[0.65rem] text-muted">transcript only</span>
            </button>
            <button
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5"
              onClick={() =>
                withOptions((input) =>
                  downloadText(
                    exportFilename(input.mode, "json"),
                    buildJsonExport(input),
                    "application/json"
                  )
                )
              }
            >
              🧩 JSON — lossless
              <span className="block text-[0.65rem] text-muted">re-importable backup</span>
            </button>

            <div className="my-1 border-t border-line" />

            {(
              [
                ["includeTimestamps", "Timestamps"],
                ["includeHandRaises", "Hand-raise appendix"],
                ["includePersonaInstructions", "Persona instructions"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-white/5"
              >
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
                  className="h-3 w-3 accent-[var(--accent)]"
                />
                {label}
              </label>
            ))}

            <div className="my-1 border-t border-line" />

            <button
              className="block w-full truncate rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5"
              onClick={() =>
                withOptions((input) => {
                  if (!openPrintWindow(buildPrintHtml(input))) {
                    useChatStore.setState({
                      error: "Popup blocked — allow popups to print the transcript.",
                    });
                  }
                })
              }
            >
              🖨️ Print / PDF
              <span className="block text-[0.65rem] text-muted">opens print dialog</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
        <div className="flex items-center gap-1">
          {/* Mobile trigger for right panel bottom sheet */}
          <button
            className="show-mobile touch-target glass-strong p-2"
            onClick={() => document.body.classList.add('right-sheet-open')}
            aria-label="Open debate controls"
            title="Open debate controls"
          >
            ⚙️
          </button>
          <ExportMenu />
          <button
            onClick={clearChat}
            title="Clear conversation"
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs text-muted transition hover:bg-white/5 hover:text-foreground"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}
