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
import { ToastProvider } from "@/components/ToastProvider";

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
    <ToastProvider>
      <main className="app-layout">
      <header className="app-header">
        <Header />
      </header>
      
      {/* Mobile sidebar toggle button */}
      <button
        className="show-mobile fixed top-16 left-4 z-40 touch-target glass-strong p-2"
        onClick={() => document.body.classList.add('sidebar-open')}
        aria-label="Open persona roster"
      >
        🎭
      </button>

      {/* Sidebar - mobile drawer, tablet+ visible */}
      <aside className="app-sidebar side-drawer hide-mobile lg:flex lg:flex-col lg:relative lg:transform-none lg:shadow-none lg:border-r lg:border-line lg:bg-transparent lg:z-auto">
        <div className="lg:hidden flex items-center justify-between p-3 border-b border-line">
          <span className="font-semibold">Persona Roster</span>
          <button
            onClick={() => document.body.classList.remove('sidebar-open')}
            className="touch-target p-2"
            aria-label="Close persona roster"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PersonaRoster onRequestUpgrade={() => setUpgradeOpen(true)} />
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      <div
        className="drawer-backdrop lg:hidden"
        onClick={() => document.body.classList.remove('sidebar-open')}
        aria-hidden="true"
      />

      <main className="app-main flex flex-col min-h-0">
        <ChatPanel />
        <ChatInput />
      </main>

      {/* Right panel - mobile bottom sheet, desktop visible */}
      <aside className="app-right hide-mobile lg:flex lg:flex-col lg:overflow-y-auto pr-1">
        <DebatePanel />
        <ApiSettings />
      </aside>

      {/* Mobile bottom sheet for right panel */}
      <div className="bottom-sheet show-mobile lg:hidden" id="right-sheet" role="dialog" aria-label="Debate controls and settings">
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-content">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Controls & Settings</h2>
            <button
              onClick={() => document.body.classList.remove('right-sheet-open')}
              className="touch-target p-2"
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <DebatePanel />
          <ApiSettings />
        </div>
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
    </ToastProvider>
  );
}
