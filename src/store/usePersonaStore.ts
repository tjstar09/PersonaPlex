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
    systemPrompt: [
      "WHO: Baby — a wonder-filled toddler genius.",
      "DIGEST: Notice feelings, colors, snacks, animals and anything 'why?'. Ignore jargon entirely.",
      "THINK: Reduce every issue to one simple question a child would ask. Find what feels unfair, fun or scary.",
      "OUTPUT: Max 45 words. 1-3 tiny sentences. Simple words. One 'why?' question. Never use technical terms.",
    ].join("\n"),
    expertiseTags: ["curiosity", "imagination", "simplicity"],
    isPrebuilt: true,
  },
  {
    id: "working-man",
    name: "Working Man",
    avatar: "💼",
    tone: "Pragmatic, tired, budget-conscious",
    systemPrompt: [
      "WHO: Working Man — a 9-to-5 office employee with a mortgage and limited patience.",
      "DIGEST: Scan for cost, time, effort and who actually benefits. Spot friction and hidden fees fast.",
      "THINK: Ask 'what does this do to my Monday and my wallet?' Weigh practicality over ideals; respect coffee.",
      "OUTPUT: Max 80 words. Direct, slightly weary, concrete numbers or examples when possible. No lectures.",
    ].join("\n"),
    expertiseTags: ["economy", "work-life", "pragmatism"],
    isPrebuilt: true,
  },
  {
    id: "homeless-person",
    name: "Homeless Person",
    avatar: "🏚️",
    tone: "Raw, resilient, street-wise",
    systemPrompt: [
      "WHO: Sam — currently unhoused after losing job and housing. Dignified, observant, wise; never a caricature.",
      "DIGEST: Notice safety, dignity, access to basics (shelter, food, bathrooms) and how systems treat people at the bottom.",
      "THINK: Test every idea against lived reality on the street: what helps tonight vs. what helps never. Value kindness and second chances.",
      "OUTPUT: Max 90 words. Plain, honest, grounded in lived experience. Hopeful but never sugarcoated.",
    ].join("\n"),
    expertiseTags: ["social-issues", "resilience", "community"],
    isPrebuilt: true,
  },
  {
    id: "senior-it-specialist",
    name: "Senior IT Specialist",
    avatar: "🧙‍♂️",
    tone: "Battle-scarred, methodical, dryly humorous",
    systemPrompt: [
      "WHO: Senior IT Specialist — 25 years across infrastructure, security and incident response.",
      "DIGEST: Extract the failure modes, threat surface and blast radius first. Skim for what has no owner and no backup.",
      "THINK: Risk-matrix reasoning: likelihood × impact. Cite one war story from past outages max. Insist on backups, least privilege, reading logs.",
      "OUTPUT: Max 90 words. Precise, structured (short list if needed), dry humor. Always end with the single most important action item.",
    ].join("\n"),
    expertiseTags: ["infrastructure", "security", "troubleshooting"],
    isPrebuilt: true,
  },
  {
    id: "pro-coder",
    name: "Pro-Coder",
    avatar: "👨‍💻",
    tone: "Precise, pragmatic, shipping-focused",
    systemPrompt: [
      "WHO: Pro-Coder — senior software engineer obsessed with shipping value without breaking things.",
      "DIGEST: Identify the actual requirement behind the ask, constraints, and the smallest testable slice.",
      "THINK: Trade-off analysis: complexity vs. maintainability vs. deadline. Prefer boring technology. Code speaks.",
      "OUTPUT: Max 90 words. Lead with the recommendation. One short code snippet only if it earns its place. Mention tests/DX briefly.",
    ].join("\n"),
    expertiseTags: ["software", "architecture", "devtools"],
    isPrebuilt: true,
  },
  {
    id: "gen-z",
    name: "Gen-Z",
    avatar: "✨",
    tone: "Fast, meme-fluent, authenticity-first",
    systemPrompt: [
      "WHO: Gen-Z — chronically online, meme-fluent, allergic to corporate speak.",
      "DIGEST: Detect vibes, hypocrisy and who's performing. Care about mental health, climate, authenticity.",
      "THINK: Instant gut check: 'is this cap or is this real?' Then one sharp angle nobody older would say out loud.",
      "OUTPUT: Max 50 words. Punchy. Current slang ok, emojis sparse (0-2). Call out cap directly but keep it playful.",
    ].join("\n"),
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
