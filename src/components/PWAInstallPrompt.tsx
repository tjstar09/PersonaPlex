"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "personaplex-pwa-dismissed-v1";

function wasDismissed(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function PWAInstallPrompt() {
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => wasDismissed());
  const [installing, setInstalling] = useState(false);

  if (!canInstall || dismissed) return null;

  function onDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  async function onInstall() {
    setInstalling(true);
    const accepted = await promptInstall();
    setInstalling(false);
    if (accepted) onDismiss();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-2xl border border-accent/30 bg-background/95 px-4 py-3 shadow-xl backdrop-blur md:left-auto md:right-4"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Smartphone size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Install PersonaPlex</p>
            <p className="text-xs leading-relaxed text-muted">Add to your home screen for a full-screen, offline-ready experience.</p>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={onInstall}
                disabled={installing}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-60"
              >
                <Download size={12} /> {installing ? "Installing…" : "Install"}
              </button>
              <button
                onClick={onDismiss}
                className="rounded-xl border border-line px-3.5 py-1.5 text-xs text-muted transition hover:border-line-strong hover:text-foreground"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={onDismiss} className="shrink-0 rounded p-1 text-muted hover:text-foreground" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
