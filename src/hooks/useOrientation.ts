"use client";

import { useSyncExternalStore } from "react";

export type OrientationKind = "portrait" | "landscape";

function getOrientation(): OrientationKind {
  if (typeof window === "undefined") return "portrait";
  // Modern Screen Orientation API preferred
  const type = (window.screen.orientation?.type ?? "") as string;
  if (type.startsWith("portrait")) return "portrait";
  if (type.startsWith("landscape")) return "landscape";
  return window.innerHeight > window.innerWidth ? "portrait" : "landscape";
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  window.screen.orientation?.addEventListener("change", cb);
  const mm = window.matchMedia("(orientation: portrait)");
  mm.addEventListener("change", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
    window.screen.orientation?.removeEventListener("change", cb);
    mm.removeEventListener("change", cb);
  };
}

export function useOrientation(): OrientationKind {
  return useSyncExternalStore(subscribe, getOrientation, () => "portrait" as OrientationKind);
}
