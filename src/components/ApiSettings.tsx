"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Save, ShieldCheck } from "lucide-react";
import { apiConfigSchema, useApiStore } from "@/store/useApiStore";
import { usePersonaStore } from "@/store/usePersonaStore";
import { ModelPicker } from "./ModelPicker";

export function ApiSettings() {
  const config = useApiStore((s) => s.config);
  const saveConfig = useApiStore((s) => s.saveConfig);
  const premiumUnlocked = usePersonaStore((s) => s.premiumUnlocked);
  const setPremiumUnlocked = usePersonaStore((s) => s.setPremiumUnlocked);

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

      <div className="flex items-center justify-between rounded-2xl border border-line px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <ShieldCheck size={14} style={{ color: premiumUnlocked ? "#8b5cf6" : "#98a0b8" }} />
          Premium Tier (mock)
        </div>
        <button
          role="switch"
          aria-checked={premiumUnlocked}
          onClick={() => setPremiumUnlocked(!premiumUnlocked)}
          className={`relative h-6 w-11 rounded-full transition ${
            premiumUnlocked ? "bg-accent" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
              premiumUnlocked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
