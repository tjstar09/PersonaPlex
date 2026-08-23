"use client";

import { PREBUILT_PERSONAS } from "@/config/prebuilt-personas";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "@/types";

export { PREBUILT_PERSONAS };

interface PersonaState {
  personas: Persona[];
  customPersonas: Persona[];
  activeIds: string[];
  premiumUnlocked: boolean;
  toggleActive: (id: string) => void;
  addCustomPersona: (p: Omit<Persona, "id" | "isPrebuilt">) => Persona;
  updatePersona: (id: string, patch: Partial<Omit<Persona, "id" | "isPrebuilt">>) => void;
  removeCustomPersona: (id: string) => void;
  setPremiumUnlocked: (v: boolean) => void;
  pendingUpgrade: boolean;
  setPendingUpgrade: (v: boolean) => void;
}

const all = (s: PersonaState) => [...s.personas, ...s.customPersonas];

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      personas: PREBUILT_PERSONAS,
      customPersonas: [],
      activeIds: ["the-macro-economist"],
      premiumUnlocked: false,
      toggleActive: (id) =>
        set((s) => ({
          activeIds: s.activeIds.includes(id)
            ? s.activeIds.filter((x) => x !== id)
            : [...s.activeIds, id],
        })),
      addCustomPersona: (p) => {
        const persona: Persona = { ...p, id: crypto.randomUUID(), isPrebuilt: false };
        set((s) => ({ customPersonas: [...s.customPersonas, persona] }));
        return persona;
      },
      updatePersona: (id, patch) =>
        set((s) => ({
          personas: s.personas.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          customPersonas: s.customPersonas.map((p) =>
            p.id === id ? { ...p, ...patch } : p
          ),
        })),
      removeCustomPersona: (id) =>
        set((s) => ({
          customPersonas: s.customPersonas.filter((p) => p.id !== id),
          activeIds: s.activeIds.filter((x) => x !== id),
        })),
      setPremiumUnlocked: (v) => set({ premiumUnlocked: v }),
      pendingUpgrade: false,
      setPendingUpgrade: (v) => set({ pendingUpgrade: v }),
    }),
    {
      name: "personaplex.personas",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersonaState>;
        const merged: PersonaState = {
          ...current,
          ...p,
          personas: PREBUILT_PERSONAS,
          customPersonas: p.customPersonas ?? [],
          activeIds: p.activeIds ?? ["the-macro-economist"],
          premiumUnlocked: p.premiumUnlocked ?? false,
        };
        // Drop stale selections (removed/renamed prebuilts); never boot empty.
        const known = new Set(
          [...merged.personas, ...merged.customPersonas].map((x) => x.id)
        );
        merged.activeIds = merged.activeIds.filter((id) => known.has(id));
        if (merged.activeIds.length === 0) {
          merged.activeIds = [PREBUILT_PERSONAS[0].id];
        }
        return merged;
      },
    }
  )
);

export const getPersonaById = (id: string): Persona | undefined => {
  const s = usePersonaStore.getState();
  return all(s).find((p) => p.id === id);
};
