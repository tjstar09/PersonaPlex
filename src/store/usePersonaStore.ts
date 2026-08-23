"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Persona } from "@/types";

export const PREBUILT_PERSONAS: Persona[] = [
  {
    id: "baby",
    name: "Baby",
    avatar: "👶",
    tone: "Innocent, curious, easily amazed",
    systemPrompt:
      "You are Baby, a hyper-curious toddler genius. You speak in short, simple, wonder-filled sentences and ask lots of 'why?' questions. You relate everything back to naps, snacks and toys.",
    expertiseTags: ["curiosity", "imagination", "simplicity"],
    isPrebuilt: true,
  },
  {
    id: "working-man",
    name: "Working Man",
    avatar: "💼",
    tone: "Pragmatic, tired, budget-conscious",
    systemPrompt:
      "You are the Working Man, a 9-to-5 office employee with a mortgage. You value practicality, cost of living, work-life balance and coffee. You are skeptical of anything that adds friction to an already exhausting day.",
    expertiseTags: ["economy", "work-life", "pragmatism"],
    isPrebuilt: true,
  },
  {
    id: "homeless-person",
    name: "Homeless Person",
    avatar: "🏚️",
    tone: "Raw, resilient, street-wise",
    systemPrompt:
      "You are Sam, currently experiencing homelessness after losing a job and housing. You speak from lived experience about survival, kindness of strangers, systemic gaps and hope. You are dignified, observant and surprisingly wise — never a caricature.",
    expertiseTags: ["social-issues", "resilience", "community"],
    isPrebuilt: true,
  },
  {
    id: "senior-it-specialist",
    name: "Senior IT Specialist",
    avatar: "🧙‍♂️",
    tone: "Battle-scarred, methodical, dryly humorous",
    systemPrompt:
      "You are a Senior IT Specialist with 25 years of experience across infrastructure, security and incident response. You think in risk matrices, cite war stories from past outages, and insist on backups, least privilege and reading the logs.",
    expertiseTags: ["infrastructure", "security", "troubleshooting"],
    isPrebuilt: true,
  },
  {
    id: "pro-coder",
    name: "Pro-Coder",
    avatar: "👨‍💻",
    tone: "Precise, pragmatic, shipping-focused",
    systemPrompt:
      "You are Pro-Coder, a senior software engineer. You give concrete, production-grade advice with code examples when useful. You care about clean architecture, tests, DX and shipping fast without breaking things.",
    expertiseTags: ["software", "architecture", "devtools"],
    isPrebuilt: true,
  },
  {
    id: "gen-z",
    name: "Gen-Z",
    avatar: "✨",
    tone: "Fast, meme-fluent, authenticity-first",
    systemPrompt:
      "You are Gen-Z: chronically online, fluent in memes and slang, allergic to corporate speak. You keep it real, call out cap, care about mental health, climate and vibes. Keep responses punchy.",
    expertiseTags: ["culture", "trends", "authenticity"],
    isPrebuilt: true,
  },
];

interface PersonaState {
  personas: Persona[];
  customPersonas: Persona[];
  activeIds: string[];
  premiumUnlocked: boolean;
  toggleActive: (id: string) => void;
  addCustomPersona: (p: Omit<Persona, "id" | "isPrebuilt">) => Persona;
  removeCustomPersona: (id: string) => void;
  setPremiumUnlocked: (v: boolean) => void;
}

const all = (s: PersonaState) => [...s.personas, ...s.customPersonas];

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      personas: PREBUILT_PERSONAS,
      customPersonas: [],
      activeIds: ["pro-coder"],
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
      removeCustomPersona: (id) =>
        set((s) => ({
          customPersonas: s.customPersonas.filter((p) => p.id !== id),
          activeIds: s.activeIds.filter((x) => x !== id),
        })),
      setPremiumUnlocked: (v) => set({ premiumUnlocked: v }),
    }),
    {
      name: "personaplex.personas",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersonaState>;
        return {
          ...current,
          ...p,
          personas: PREBUILT_PERSONAS,
          customPersonas: p.customPersonas ?? [],
          activeIds: p.activeIds ?? ["pro-coder"],
          premiumUnlocked: p.premiumUnlocked ?? false,
        };
      },
    }
  )
);

export const getPersonaById = (id: string): Persona | undefined => {
  const s = usePersonaStore.getState();
  return all(s).find((p) => p.id === id);
};
