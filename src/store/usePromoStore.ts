"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localValidator, PROMO_TRIAL_DAYS } from "@/config/promo-codes";

export interface PromoActivation {
  codeHash: string;
  activatedAt: number;
}

interface PromoState {
  activation: PromoActivation | null;
  /** Redeemed hashes on this device — enforces once-per-user. */
  usedHashes: string[];
  redeem: (code: string) => Promise<{ ok: boolean; error?: string; daysLeft?: number }>;
  deactivate: () => void;
}

const TRIAL_MS = PROMO_TRIAL_DAYS * 24 * 60 * 60 * 1000;

/** Is a promo activation currently within its 7-day window? */
export function isPromoActive(activation: PromoActivation | null): boolean {
  return !!activation && Date.now() - activation.activatedAt < TRIAL_MS;
}

export function promoDaysLeft(activation: PromoActivation | null): number {
  if (!activation || !isPromoActive(activation)) return 0;
  const msLeft = activation.activatedAt + TRIAL_MS - Date.now();
  return Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set, get) => ({
      activation: null,
      usedHashes: [],

      redeem: async (code) => {
        const trimmed = code.trim();
        if (!trimmed) return { ok: false, error: "Enter a code" };

        // Once-per-user check (this device) before anything else.
        const candidateHash = await import("@/config/promo-codes").then((m) =>
          m.sha256Hex(trimmed.toUpperCase())
        );
        if (get().usedHashes.includes(candidateHash)) {
          return { ok: false, error: "This code was already used on this device" };
        }

        const result = await localValidator.validate(trimmed);
        if (!result.ok) return { ok: false, error: result.error };
        if (get().usedHashes.includes(result.hash)) {
          return { ok: false, error: "This code was already used on this device" };
        }

        set((s) => ({
          activation: { codeHash: result.hash, activatedAt: Date.now() },
          usedHashes: [...s.usedHashes, result.hash],
        }));
        return { ok: true, daysLeft: PROMO_TRIAL_DAYS };
      },

      deactivate: () => set({ activation: null }),
    }),
    { name: "personaplex.promo" }
  )
);
