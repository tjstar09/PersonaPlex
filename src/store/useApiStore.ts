"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { z } from "zod";
import type { ApiConfig } from "@/types";

export const apiConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  maxTokens: z.number().int().positive().max(200000),
});

const defaultConfig: ApiConfig = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "",
  model: "openai/gpt-4o-mini",
  maxTokens: 1024,
};

interface ApiState {
  config: ApiConfig;
  saveConfig: (partial: Partial<ApiConfig>) => void;
  clearConfig: () => void;
  isConfigured: () => boolean;
}

export const useApiStore = create<ApiState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      saveConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),
      clearConfig: () => set({ config: { ...defaultConfig } }),
      isConfigured: () => apiConfigSchema.safeParse(get().config).success,
    }),
    { name: "personaplex.api" }
  )
);
