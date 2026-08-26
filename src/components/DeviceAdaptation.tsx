"use client";

import { useEffect } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useDeviceCapabilities } from "@/hooks/useDeviceCapabilities";
import { useOrientation } from "@/hooks/useOrientation";

/**
 * Applies document-level adaptation classes for:
 * - prefers-reduced-motion
 * - low-end device (cores/memory/save-data/effectiveType)
 * - orientation (portrait vs landscape)
 * Must be mounted once near the layout root.
 */
export function DeviceAdaptation() {
  const reduced = usePrefersReducedMotion();
  const { isLowEnd, saveData } = useDeviceCapabilities();
  const orientation = useOrientation();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("reduced-motion", reduced);
    root.classList.toggle("low-end", isLowEnd);
    root.classList.toggle("save-data", saveData);
    root.classList.toggle("orientation-portrait", orientation === "portrait");
    root.classList.toggle("orientation-landscape", orientation === "landscape");
    // Also sync to body for globals.css body.* selectors
    document.body.classList.toggle("reduced-motion", reduced);
    document.body.classList.toggle("low-end", isLowEnd);
  }, [reduced, isLowEnd, saveData, orientation]);

  return null;
}
