"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, Wand2, X } from "lucide-react";
import { useApiStore } from "@/store/useApiStore";
import { usePersonaStore } from "@/store/usePersonaStore";
import { enhancePersonaDraft } from "@/lib/persona-enhancer";
import type { Persona } from "@/types";

interface PersonaModalProps {
  open: boolean;
  /** Present = edit mode; absent = create mode. */
  persona?: Persona | null;
  onClose: () => void;
}

export function PersonaModal({ open, persona, onClose }: PersonaModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <PersonaForm
          key={persona?.id ?? "__new__"}
          persona={persona ?? null}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

function PersonaForm({
  persona,
  onClose,
}: {
  persona: Persona | null;
  onClose: () => void;
}) {
  const addCustomPersona = usePersonaStore((s) => s.addCustomPersona);
  const updatePersona = usePersonaStore((s) => s.updatePersona);

  const [form, setForm] = useState(() =>
    persona
      ? {
          name: persona.name,
          avatar: persona.avatar,
          tone: persona.tone,
          systemPrompt: persona.systemPrompt,
          tags: persona.expertiseTags.join(", "),
        }
      : { name: "", avatar: "🧩", tone: "", systemPrompt: "", tags: "" }
  );
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function enhance() {
    const config = useApiStore.getState().config;
    if (!config.apiKey) {
      setEnhanceError("Save your API key in BYO API Configuration first.");
      return;
    }
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const improved = await enhancePersonaDraft(config, {
        name: form.name,
        avatar: form.avatar,
        tone: form.tone,
        systemPrompt: form.systemPrompt,
        expertiseTags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setForm({
        name: improved.name || form.name,
        avatar: improved.avatar || form.avatar,
        tone: improved.tone || form.tone,
        systemPrompt: improved.systemPrompt || form.systemPrompt,
        tags: improved.expertiseTags.join(", ") || form.tags,
      });
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setEnhancing(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    const payload = {
      name: form.name.trim(),
      avatar: form.avatar.trim() || "🧩",
      tone: form.tone.trim() || "Custom",
      systemPrompt: form.systemPrompt.trim(),
      expertiseTags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (persona) {
      updatePersona(persona.id, payload);
    } else {
      addCustomPersona(payload);
    }
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 12 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="glass max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-3xl bg-background/95 p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {persona ? `Edit ${persona.name}` : "Create Custom Persona"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-3">
          <input
            value={form.avatar}
            onChange={(e) => patch({ avatar: e.target.value })}
            maxLength={4}
            className="w-16 rounded-xl border border-line bg-surface px-3 py-2 text-center text-xl outline-none focus:border-accent"
          />
          <input
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Persona name *"
            required
            className="flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <input
          value={form.tone}
          onChange={(e) => patch({ tone: e.target.value })}
          placeholder="Tone (e.g. Sarcastic mentor)"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <textarea
          value={form.systemPrompt}
          onChange={(e) => patch({ systemPrompt: e.target.value })}
          placeholder={"Rough notes are fine — WHO they are, what they care about, how they talk. *"}
          required
          rows={5}
          className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          value={form.tags}
          onChange={(e) => patch({ tags: e.target.value })}
          placeholder="Expertise tags (comma separated)"
          className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />

        {enhanceError && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {enhanceError}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void enhance()}
            disabled={enhancing}
            title="Rewrite these notes into a structured character sheet using your LLM endpoint"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent-2/50 bg-cyan-400/10 px-3 py-2.5 text-xs font-medium text-accent-2 transition hover:bg-cyan-400/20 disabled:opacity-40"
          >
            {enhancing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wand2 size={14} />
            )}
            ✨ Enhance with AI
          </button>
          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            style={{ boxShadow: "var(--glow-accent)" }}
          >
            <Sparkles size={14} />
            {persona ? "Save Changes" : "Add to Roster"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
