"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Skip SW in dev to avoid stale cache during HMR
    if (process.env.NODE_ENV !== "production") return;

    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const swUrl = `${base}/sw.js`;

    function register() {
      navigator.serviceWorker.register(swUrl, { scope: base ? `${base}/` : "/" }).catch(() => {
        // Registration may fail on file:// or unsupported context — non-fatal
      });
    }

    // Defer registration until after hydration to avoid racing with Next's chunks
    const id = window.setTimeout(register, 1500);
    window.addEventListener("load", register, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
