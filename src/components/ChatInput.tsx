"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Hand } from "lucide-react";
import { getPersonaById, usePersonaStore } from "@/store/usePersonaStore";
import { useChatStore } from "@/store/useChatStore";

export function ChatInput() {
  const [value, setValue] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendDirect = useChatStore((s) => s.sendDirect);
  const startDebate = useChatStore((s) => s.startDebate);
  const isBusy = useChatStore((s) => s.isBusy);
  const activeIds = usePersonaStore((s) => s.activeIds);

  const activePersonas = useMemo(
    () => activeIds.map(getPersonaById).filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [activeIds]
  );

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return activePersonas.filter((p) => p.name.toLowerCase().startsWith(q));
  }, [mentionQuery, activePersonas]);

  function detectMention(text: string, caret: number) {
    const before = text.slice(0, caret);
    const match = before.match(/@([\w-]*)$/);
    const nextQuery = match ? match[1] : null;
    setMentionQuery(nextQuery);
    setHighlightIndex(0);
  }

  function applyMention(name: string) {
    if (mentionQuery === null || !textareaRef.current) return;
    const el = textareaRef.current;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret).replace(/@([\w-]*)$/, `@${name} `);
    const after = value.slice(caret);
    setValue(before + after);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionMatches.length > 0 && mentionQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applyMention(mentionMatches[highlightIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function submit() {
    const text = value.trim();
    if (!text || isBusy) return;
    setValue("");
    setMentionQuery(null);
    await sendDirect(text);
  }

  const showMentions = mentionQuery !== null && mentionMatches.length > 0;

  return (
    <div className="relative px-4 pb-4">
      <AnimatePresence>
        {showMentions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass absolute bottom-full left-4 z-20 mb-2 w-72 overflow-hidden rounded-2xl"
          >
            <div className="px-3 pt-2 text-[0.7rem] uppercase tracking-wider text-muted">
              Call a persona
            </div>
            {mentionMatches.map((p, i) => (
              <button
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(p.name);
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                  i === highlightIndex ? "bg-accent/25" : ""
                }`}
              >
                <span className="text-lg">{p.avatar}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="truncate text-xs text-muted">{p.expertiseTags[0]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass flex items-end gap-2 rounded-3xl p-2 focus-within:border-line-strong">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={isBusy}
          placeholder={
            isBusy
              ? "Personas are speaking — stream lock active…"
              : "Message personas… type @ to call one, or start a debate from the right panel"
          }
          onChange={(e) => {
            setValue(e.target.value);
            detectMention(e.target.value, e.target.selectionStart ?? 0);
          }}
          onKeyDown={handleKeyDown}
          className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-[0.92rem] outline-none placeholder:text-muted/70 disabled:opacity-50"
        />
        <button
          onClick={() => {
            setValue(`🎤 Debate kickoff: ${useChatStore.getState().topic}`);
            void startDebate();
          }}
          disabled={isBusy || !useChatStore.getState().topic.trim()}
          title="Launch debate with current topic"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent/40 text-accent transition hover:bg-accent-soft disabled:opacity-40"
        >
          <Hand size={17} />
        </button>
        <button
          onClick={submit}
          disabled={isBusy || !value.trim()}
          title="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-white transition hover:brightness-110 disabled:opacity-40"
          style={{ boxShadow: "var(--glow-accent)" }}
        >
          <CornerDownLeft size={17} />
        </button>
      </div>
    </div>
  );
}
