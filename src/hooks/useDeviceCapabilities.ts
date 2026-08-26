"use client";

import { useSyncExternalStore } from "react";

type EffectiveType = "slow-2g" | "2g" | "3g" | "4g" | undefined;

interface Capabilities {
  isLowEnd: boolean;
  cores: number | null;
  memoryGB: number | null;
  effectiveType: EffectiveType;
  saveData: boolean;
}

const SERVER_CAPS: Capabilities = { isLowEnd: false, cores: null, memoryGB: null, effectiveType: undefined, saveData: false };
let cached: Capabilities | null = null;

function getSnapshot(): Capabilities {
  if (typeof navigator === "undefined") {
    return SERVER_CAPS;
  }
  const nav = navigator as unknown as Record<string, unknown>;
  const cores = typeof nav.hardwareConcurrency === "number" ? (nav.hardwareConcurrency as number) : null;
  const memoryGB = typeof nav.deviceMemory === "number" ? (nav.deviceMemory as number) : null;
  const conn = nav.connection as Record<string, unknown> | undefined;
  const effectiveType = conn?.effectiveType as EffectiveType | undefined;
  const saveData = Boolean(conn?.saveData);

  const isLowEnd =
    (cores !== null && cores <= 4) ||
    (memoryGB !== null && memoryGB <= 4) ||
    saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g";

  if (
    cached &&
    cached.cores === cores &&
    cached.memoryGB === memoryGB &&
    cached.effectiveType === effectiveType &&
    cached.saveData === saveData &&
    cached.isLowEnd === isLowEnd
  ) {
    return cached;
  }
  cached = { isLowEnd, cores, memoryGB, effectiveType, saveData };
  return cached;
}

function subscribe(cb: () => void) {
  if (typeof navigator === "undefined") return () => {};
  const conn = (navigator as unknown as Record<string, unknown>).connection as
    | (EventTarget & Record<string, unknown>)
    | undefined;
  conn?.addEventListener?.("change", cb as EventListener);
  return () => conn?.removeEventListener?.("change", cb as EventListener);
}

export function useDeviceCapabilities(): Capabilities {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
