"use client";

import { useCallback } from "react";
import { usePersonaStore } from "@/store/usePersonaStore";
import { useSyncExternalStore } from "react";

const FEATURE_LABELS: Record<string, string> = {
  max_active_personas: "Active personas per session",
};

export function useFeatureFlag(key: string, freeLimit: number) {
  const premiumUnlocked = usePersonaStore((s) => s.premiumUnlocked);
  const setPremiumUnlocked = usePersonaStore((s) => s.setPremiumUnlocked);

  const premiumLimit = 10;
  const limit = premiumUnlocked ? Math.max(premiumLimit, freeLimit) : freeLimit;

  const checkCanAdd = useCallback(
    (currentCount: number) => currentCount < limit,
    [limit]
  );

  const label = FEATURE_LABELS[key] ?? key;

  return {
    key,
    label,
    limit,
    unlocked: premiumUnlocked,
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
