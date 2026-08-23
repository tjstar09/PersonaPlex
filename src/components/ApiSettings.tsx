"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Save, ShieldCheck, TicketX } from "lucide-react";
import { apiConfigSchema, useApiStore } from "@/store/useApiStore";
import { usePersonaStore } from "@/store/usePersonaStore";
import { usePromoStore } from "@/store/usePromoStore";
import { usePremiumStatus } from "@/hooks/useFeatureFlag";
import { ModelPicker } from "./ModelPicker";

export function ApiSettings() {
  const config = useApiStore((s) => s.config);
  const saveConfig = useApiStore((s) => s.saveConfig);

  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [maxTokens, setMaxTokens] = useState(String(config.maxTokens));
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const candidate = {
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      maxTokens: Number(maxTokens) || 1024,
    };
    const parsed = apiConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid configuration");
      return;
    }
    setValidationError(null);
    saveConfig(candidate);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <KeyRound size={15} className="text-accent" />
        BYO API Configuration
      </div>
      <p className="text-[0.7rem] leading-relaxed text-muted">
        Stored only in your browser&apos;s localStorage. Supports any
        OpenAI-compatible endpoint (OpenRouter, OmniRoute, OpenCode Zen, OpenAI…).
      </p>

      <form onSubmit={save} className="space-y-2.5">
        <label className="block">
          <span className="mb-1 block text-[0.68rem] uppercase tracking-wider text-muted">Endpoint URL</span>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
          />
        </label>
        <ModelPicker
          value={model}
          onChange={setModel}
          baseUrl={baseUrl}
          apiKey={apiKey}
        />
        <label className="block">
          <span className="mb-1 block text-[0.68rem] uppercase tracking-wider text-muted">API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-or-…"
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.68rem] uppercase tracking-wider text-muted">Max Tokens</span>
          <input
            type="number"
            min={64}
            max={200000}
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
          />
        </label>

        {validationError && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {validationError}
          </div>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/50 bg-accent/15 py-2.5 text-sm font-medium transition hover:bg-accent/25"
        >
          {savedAt ? (
            <>
              <CheckCircle2 size={15} className="text-emerald-400" /> Saved to localStorage
            </>
          ) : (
            <>
              <Save size={15} /> Save Credentials
            </>
          )}
        </button>
      </form>

      <PremiumStatusCard />
    </div>
  );
}

function PremiumStatusCard() {
  const premium = usePremiumStatus();
  const activation = usePromoStore((s) => s.activation);
  const deactivate = usePromoStore((s) => s.deactivate);
  const premiumUnlocked = usePersonaStore((s) => s.premiumUnlocked);
  const setPremiumUnlocked = usePersonaStore((s) => s.setPremiumUnlocked);

  return (
    <div className="rounded-2xl border border-line px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} style={{ color: premium.active ? "#8b5cf6" : "#98a0b8" }} />
          <span className="min-w-0 truncate">
            {premium.active ? (
              premium.source === "promo" ? (
                <>Promo trial · <strong className="text-foreground">{premium.daysLeft}d left</strong></>
              ) : (
                <>Premium mock (manual toggle)</>
              )
            ) : (
              "Free tier"
            )}
          </span>
        </div>
        {premium.source === "promo" ? (
          <button
            onClick={deactivate}
            title="End the promo trial on this device now"
            className="flex shrink-0 items-center gap-1 rounded-lg border border-danger/40 px-2 py-1 text-[0.65rem] text-danger transition hover:bg-danger/10"
          >
            <TicketX size={11} /> End
          </button>
        ) : (
          <button
            role="switch"
            aria-checked={premiumUnlocked}
            onClick={() => setPremiumUnlocked(!premiumUnlocked)}
            title="Manually toggle mock premium"
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              premiumUnlocked ? "bg-accent" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                premiumUnlocked ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        )}
      </div>
      {premium.source === "promo" && activation && (
        <div className="mt-1 truncate text-[0.62rem] text-muted/70">
          code #{activation.codeHash.slice(0, 10)}… · auto-expires
        </div>
      )}
    </div>
  );
}
