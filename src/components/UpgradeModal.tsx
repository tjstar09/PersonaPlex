"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Crown, Lock, Ticket, X } from "lucide-react";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { usePromoStore } from "@/store/usePromoStore";

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
            className="glass-strong relative w-full max-w-sm overflow-hidden rounded-3xl p-6 text-center"
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

            <PromoCodeBox onRedeemed={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PromoCodeBox({ onRedeemed }: { onRedeemed: () => void }) {
  const redeem = usePromoStore((s) => s.redeem);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setError(null);
    const result = await redeem(code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Invalid code");
      return;
    }
    setSuccess(result.daysLeft ?? 7);
    setCode("");
    setTimeout(onRedeemed, 1400);
  }

  return (
    <div className="mt-4 rounded-2xl border border-line p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wider text-muted">
        <Ticket size={12} /> Have a promo code?
      </div>
      <form onSubmit={apply} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          placeholder="Secret code"
          autoComplete="off"
          disabled={success !== null}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm tracking-widest uppercase outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !code.trim() || success !== null}
          className="shrink-0 rounded-xl border border-accent/60 bg-accent/15 px-3 py-2 text-xs font-medium transition hover:bg-accent/25 disabled:opacity-40"
        >
          Apply
        </button>
      </form>
      {error && (
        <div className="mt-2 text-xs text-danger">{error}</div>
      )}
      {success !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#34d399" }}>
          <CheckCircle2 size={13} /> Premium active for {success} days — enjoy!
        </div>
      )}
    </div>
  );
}
