"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Pencil, Plus, Sparkles, Trash2, UserRoundCheck } from "lucide-react";
import { usePersonaStore } from "@/store/usePersonaStore";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { PersonaModal } from "./PersonaModal";
import type { Persona } from "@/types";

export function PersonaRoster({ onRequestUpgrade }: { onRequestUpgrade: () => void }) {
  const personas = usePersonaStore((s) => s.personas);
  const customPersonas = usePersonaStore((s) => s.customPersonas);
  const activeIds = usePersonaStore((s) => s.activeIds);
  const toggleActive = usePersonaStore((s) => s.toggleActive);
  const removeCustomPersona = usePersonaStore((s) => s.removeCustomPersona);
  const flag = useFeatureFlag("max_active_personas", 3);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Persona | null>(null);

  const allPersonas = useMemo(() => [...personas, ...customPersonas], [personas, customPersonas]);

  function attemptToggle(id: string) {
    const isActive = activeIds.includes(id);
    if (!isActive && !flag.checkCanAdd(activeIds.length)) {
      onRequestUpgrade();
      return;
    }
    toggleActive(id);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Persona) {
    setEditing(p);
    setModalOpen(true);
  }

  return (
    <div className="glass flex min-h-0 flex-col overflow-hidden rounded-3xl">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <UserRoundCheck size={15} className="text-accent-2" />
          Persona Roster
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[0.68rem] ${
            flag.unlocked
              ? "border-accent/60 bg-accent-soft text-accent"
              : "border-line text-muted"
          }`}
        >
          {flag.unlocked ? "PREMIUM" : `${activeIds.length}/${flag.limit} active`}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {allPersonas.map((p) => {
          const isActive = activeIds.includes(p.id);
          return (
            <motion.div
              key={p.id}
              layout
              className={`group flex items-center gap-2.5 rounded-2xl border px-3 py-2 transition ${
                isActive
                  ? "border-accent/50 bg-accent-soft"
                  : "border-transparent hover:border-line hover:bg-white/[0.03]"
              }`}
            >
              <button
                onClick={() => attemptToggle(p.id)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                title={
                  isActive || flag.checkCanAdd(activeIds.length)
                    ? `Toggle ${p.name}`
                    : "Free tier limit reached — click to see upgrade options"
                }
              >
                <span className="text-xl">{p.avatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {p.name}
                    {!p.isPrebuilt && (
                      <Sparkles size={11} className="shrink-0 text-accent-2" />
                    )}
                  </span>
                  <span className="block truncate text-[0.72rem] text-muted">{p.tone}</span>
                </span>
                {!isActive && !flag.checkCanAdd(activeIds.length) && (
                  <Lock size={13} className="shrink-0 text-warning" style={{ color: "#fbbf24" }} />
                )}
                {isActive && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                )}
              </button>
              <button
                onClick={() => openEdit(p)}
                title={`Edit ${p.name}`}
                className="hidden shrink-0 rounded-lg p-1 text-muted transition group-hover:block hover:bg-white/10 hover:text-accent-2"
              >
                <Pencil size={13} />
              </button>
              {!p.isPrebuilt && (
                <button
                  onClick={() => removeCustomPersona(p.id)}
                  title={`Delete ${p.name}`}
                  className="hidden shrink-0 rounded-lg p-1 text-muted transition group-hover:block hover:bg-white/10 hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="border-t border-line p-3">
        <AnimatePresence>
          {!flag.unlocked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-3 py-2 text-[0.72rem] text-muted"
            >
              <Lock size={12} className="shrink-0" style={{ color: "#fbbf24" }} />
              Free tier: max {flag.limit} active personas. Premium unlocks 10.
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong px-3 py-2.5 text-sm text-muted transition hover:border-accent/60 hover:text-foreground"
        >
          <Plus size={15} /> Create Custom Persona
        </button>
      </div>

      <PersonaModal open={modalOpen} persona={editing} onClose={() => setModalOpen(false)} />
    </div>
  );
}
