import type { DebateTone } from "@/lib/debate-orchestrator";

export interface Persona {
  id: string;
  name: string;
  avatar: string;
  tone: string;
  systemPrompt: string;
  expertiseTags: string[];
  isPrebuilt: boolean;
}

export type ChatRole = "user" | "assistant" | "system";

export interface Suggestion {
  name: string;
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  personaId?: string;
  content: string;
  timestamp: number;
  streaming?: boolean;
  thinking?: boolean;
  suggestions?: Suggestion[];
}

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
}

export interface HandRaise {
  personaId: string;
  wantsToSpeak: boolean;
  confidence: number;
  snippet: string;
}

export type { DebateTone };
