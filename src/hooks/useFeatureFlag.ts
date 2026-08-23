"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePersonaStore } from "@/store/usePersonaStore";
import { isPromoActive, promoDaysLeft, usePromoStore } from "@/store/usePromoStore";

const FEATURE_LABELS: Record<string, string> = {
  max_active_personas: "Active personas per session",
};

/** Live premium status combining the manual mock toggle and the promo trial. */
export function usePremiumStatus() {
  const manualPremium = usePersonaStore((s) => s.premiumUnlocked);
  const activation = usePromoStore((s) => s.activation);
  // Re-render once per minute so an open tab auto-expires on time.
  useSyncExternalStore(
    (onChange) => {
      const t = setInterval(onChange, 60_000);
      return () => clearInterval(t);
    },
    () => 0,
    () => 0
  );
  const promoActive = isPromoActive(activation);
  return {
    active: manualPremium || promoActive,
    source: manualPremium ? ("toggle" as const) : promoActive ? ("promo" as const) : null,
    daysLeft: promoDaysLeft(activation),
  };
}

export function useFeatureFlag(key: string, freeLimit: number) {
  const setPremiumUnlocked = usePersonaStore((s) => s.setPremiumUnlocked);
  const { active: unlocked } = usePremiumStatus();

  const premiumLimit = 10;
  const limit = unlocked ? Math.max(premiumLimit, freeLimit) : freeLimit;

  const checkCanAdd = useCallback(
    (currentCount: number) => currentCount < limit,
    [limit]
  );

  const label = FEATURE_LABELS[key] ?? key;

  return {
    key,
    label,
    limit,
    unlocked,
    checkCanAdd,
    upgrade: () => setPremiumUnlocked(true),
    downgrade: () => setPremiumUnlocked(false),
  };
}

export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
