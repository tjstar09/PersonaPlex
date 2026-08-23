"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Lock, X } from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";

const PERKS = [
  "Up to 10 simultaneous active personas",
  "Full debate orchestration with large rosters",
  "Priority hand-raise evaluation",
];

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const flag = useFeatureFlag("max_active_personas", 3);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="glass relative w-full max-w-sm overflow-hidden rounded-3xl bg-background/95 p-6 text-center"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-1 text-muted hover:bg-white/10"
              title="Close"
            >
              <X size={16} />
            </button>

            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft"
              style={{ boxShadow: "var(--glow-accent)" }}
            >
              <Lock size={22} className="text-accent" />
            </div>

            <h2 className="text-lg font-semibold">Free tier limit reached</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              You&apos;ve hit the <strong className="text-foreground">{flag.limit}-persona</strong> limit for{" "}
              <code className="rounded bg-white/10 px-1 text-xs">{flag.key}</code>.
              Upgrade to unlock the full roster.
            </p>

            <ul className="mt-4 space-y-2 text-left">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-muted">
                  <Crown size={14} className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
                  {perk}
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                flag.upgrade();
                onClose();
              }}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] py-3 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ boxShadow: "var(--glow-accent)" }}
            >
              ✨ Unlock Premium (mock)
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
