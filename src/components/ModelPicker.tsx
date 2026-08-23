"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import { normalizeBaseUrl } from "@/lib/llm-client";

interface ModelPickerProps {
  value: string;
  onChange: (model: string) => void;
  baseUrl: string;
  apiKey: string;
}

async function fetchModelIds(baseUrl: string, apiKey: string): Promise<string[]> {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { id?: string; name?: string }[];
  };
  const raw = Array.isArray(json?.data)
    ? json.data
    : Array.isArray(json)
      ? json
      : [];
  const ids = raw
    .map((m) => (typeof m === "string" ? m : (m?.id ?? m?.name)))
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export function ModelPicker({ value, onChange, baseUrl, apiKey }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function openDropdown() {
    setOpen(true);
    if (models.length > 0 || loading) return;
    if (!/^https?:\/\//i.test(baseUrl.trim())) {
      setError("Enter a valid endpoint URL first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ids = await fetchModelIds(baseUrl, apiKey);
      if (ids.length === 0) {
        setError("Endpoint returned no models — type one manually");
      } else {
        setModels(ids);
      }
    } catch {
      setError("Couldn't load models — type one manually");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? models.filter((m) => m.toLowerCase().includes(q)) : models;
    return list.slice(0, 200);
  }, [models, value]);

  return (
    <div ref={wrapRef} className="relative">
      <span className="mb-1 flex items-center justify-between text-[0.68rem] uppercase tracking-wider text-muted">
        <span>Model Identifier</span>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : void openDropdown())}
          className="flex items-center gap-1 rounded px-1 py-0.5 text-[0.65rem] normal-case tracking-normal text-accent transition hover:bg-accent-soft"
          title="Fetch available models from the endpoint"
        >
          {loading ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <ChevronDown size={12} />
          )}
          {models.length > 0 ? `${models.length} available` : "browse"}
        </button>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => void openDropdown()}
        placeholder="openai/gpt-4o-mini"
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
      />

      <AnimatePresence>
        {open && (loading || error || filtered.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="glass-strong absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl p-1"
          >
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted">
                <Loader2 size={12} className="animate-spin" /> Loading models…
              </div>
            )}
            {!loading && error && (
              <div className="flex items-start gap-2 px-3 py-2 text-xs text-warning" style={{ color: "#fbbf24" }}>
                <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}
            {filtered.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                className={`block w-full truncate rounded-lg px-3 py-1.5 text-left text-xs transition ${
                  m === value
                    ? "bg-accent/25 text-foreground"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
