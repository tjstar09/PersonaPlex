"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { useMounted, usePremiumStatus } from "@/hooks/useFeatureFlag";
import { usePersonaStore } from "@/store/usePersonaStore";
import { useChatStore } from "@/store/useChatStore";
import { PersonaRoster } from "@/components/PersonaRoster";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatInput } from "@/components/ChatInput";
import { DebatePanel } from "@/components/DebatePanel";
import { ApiSettings } from "@/components/ApiSettings";
import { UpgradeModal } from "@/components/UpgradeModal";

function Header() {
  const premium = usePremiumStatus();
  return (
    <header className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-lg"
          style={{ boxShadow: "var(--glow-accent)" }}
        >
          🎭
        </div>
        <div>
          <div className="text-[0.95rem] font-semibold leading-tight tracking-tight">
            PersonaPlex
          </div>
          <div className="text-[0.68rem] leading-tight text-muted">
            Multi-persona chat &amp; debate stage · 100% client-side
          </div>
        </div>
      </div>
      <AnimatePresence>
        {premium.active && (
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 rounded-full border border-accent/60 bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
            title={
              premium.source === "promo"
                ? `Promo trial — ${premium.daysLeft} day(s) remaining`
                : "Manually enabled premium mock"
            }
          >
            <Sparkles size={12} />
            {premium.source === "promo" ? `Premium · ${premium.daysLeft}d left` : "Premium Active"}
          </motion.span>
        )}
      </AnimatePresence>
    </header>
  );
}

export default function Home() {
  const mounted = useMounted();
  const upgradeOpen = usePersonaStore((s) => s.pendingUpgrade);
  const setUpgradeOpen = usePersonaStore((s) => s.setPendingUpgrade);
  const error = useChatStore((s) => s.error);
  const dismissError = useChatStore((s) => s.dismissError);

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-3xl">🎭</div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-screen max-w-[1600px] flex-col">
      <Header />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-[320px_minmax(0,1fr)_340px]">
        <section className="hidden min-h-0 lg:flex lg:flex-col">
          <PersonaRoster onRequestUpgrade={() => setUpgradeOpen(true)} />
        </section>
        <section className="flex min-h-0 flex-col gap-3">
          <ChatPanel />
          <ChatInput />
        </section>
        <section className="hidden min-h-0 flex-col gap-4 overflow-y-auto pr-1 lg:flex">
          <DebatePanel />
          <ApiSettings />
        </section>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 flex max-w-lg -translate-x-1/2 items-start gap-2.5 rounded-2xl border border-danger/50 bg-background/95 px-4 py-3 text-sm shadow-xl backdrop-blur"
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
            <span className="min-w-0 break-words">{error}</span>
            <button onClick={() => dismissError()} className="shrink-0 rounded p-0.5 text-muted hover:text-foreground">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
