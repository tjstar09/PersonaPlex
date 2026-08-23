"use client";

import { create } from "zustand";
import type { ChatMessage, HandRaise, Persona } from "@/types";
import { useApiStore } from "./useApiStore";
import { getPersonaById, usePersonaStore } from "./usePersonaStore";
import {
  collectHandRaises,
  personaSystemPrompt,
  runDebateTurn,
  StreamLock,
  type DebateTone,
} from "@/lib/debate-orchestrator";
import type { ChatCompletionMessage } from "@/lib/llm-client";
import { streamChatCompletion } from "@/lib/llm-client";
import { extractSuggestions, stripSuggestionTags } from "@/lib/suggestion-parser";

const debateLock = new StreamLock();
let abortController: AbortController | null = null;
let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

function buildUserMessage(content: string): ChatMessage {
  return { id: nextId(), role: "user", content, timestamp: Date.now() };
}

interface ChatState {
  messages: ChatMessage[];
  tone: DebateTone;
  topic: string;
  isBusy: boolean;
  isEvaluatingHands: boolean;
  handRaises: HandRaise[];
  speakingPersonaId: string | null;
  queueOrder: string[];
  error: string | null;

  setTone: (t: DebateTone) => void;
  setTopic: (t: string) => void;
  clearChat: () => void;
  dismissError: () => void;
  sendDirect: (text: string) => Promise<void>;
  startDebate: () => Promise<void>;
  stop: () => void;
}

async function streamAssistantTurn(params: {
  persona: Persona;
  messages: Parameters<typeof streamChatCompletion>[1];
  signal?: AbortSignal;
}): Promise<ChatMessage> {
  const { persona, messages, signal } = params;
  const assistant: ChatMessage = {
    id: nextId(),
    role: "assistant",
    personaId: persona.id,
    content: "",
    timestamp: Date.now(),
    streaming: true,
  };
  const store = useChatStore.getState();
  useChatStore.setState({
    messages: [...store.messages, assistant],
    speakingPersonaId: persona.id,
  });

  let full = "";
  try {
    for await (const delta of streamChatCompletion(
      useApiStore.getState().config,
      messages,
      signal
    )) {
      full += delta;
      useChatStore.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistant.id ? { ...m, content: full } : m
        ),
      }));
    }
  } finally {
    const suggestions = extractSuggestions(full);
    const clean = stripSuggestionTags(full);
    useChatStore.setState((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistant.id
          ? { ...m, content: clean || full, streaming: false, suggestions }
          : m
      ),
      speakingPersonaId: null,
    }));
  }
  return assistant;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  tone: "peaceful",
  topic: "",
  isBusy: false,
  isEvaluatingHands: false,
  handRaises: [],
  speakingPersonaId: null,
  queueOrder: [],
  error: null,

  setTone: (tone) => set({ tone }),
  setTopic: (topic) => set({ topic }),
  clearChat: () => set({ messages: [], handRaises: [], queueOrder: [] }),
  dismissError: () => set({ error: null }),

  stop: () => {
    abortController?.abort();
    abortController = null;
    set({ isBusy: false, isEvaluatingHands: false, speakingPersonaId: null, queueOrder: [] });
  },

  sendDirect: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isBusy) return;
    const { activeIds } = usePersonaStore.getState();
    const personas = activeIds
      .map(getPersonaById)
      .filter((p): p is Persona => Boolean(p));
    if (personas.length === 0) {
      set({ error: "Activate at least one persona first." });
      return;
    }

    const mentions = personas.filter((p) =>
      new RegExp(`@${p.name}\\b`, "i").test(trimmed)
    );

    set((s) => ({ messages: [...s.messages, buildUserMessage(trimmed)] }));

    abortController = new AbortController();
    set({ isBusy: true, error: null });

    try {
      if (mentions.length > 0) {
        for (const persona of mentions) {
          await debateLock.run(async () => {
            const history: ChatCompletionMessage[] = get()
              .messages.slice(-12)
              .map((m) => ({
                role: m.role === "user" ? ("user" as const) : ("assistant" as const),
                content:
                  m.role === "assistant"
                    ? `${getPersonaById(m.personaId ?? "")?.name ?? "Assistant"} said: ${m.content}`
                    : m.content,
              }));
            await streamAssistantTurn({
              persona,
              signal: abortController!.signal,
              messages: [
                { role: "system", content: personaSystemPrompt(persona, personas, get().tone, "chat") },
                ...history,
              ],
            });
          });
        }
      } else if (personas.length === 1) {
        const persona = personas[0];
        await debateLock.run(async () => {
          await streamAssistantTurn({
            persona,
            signal: abortController!.signal,
            messages: [
              { role: "system", content: personaSystemPrompt(persona, personas, get().tone, "chat") },
              ...get()
                .messages.slice(-14)
                .map((m) => ({
                  role: m.role === "user" ? ("user" as const) : ("assistant" as const),
                  content: m.content,
                })),
            ],
          });
        });
      } else {
        // Multiple actives, no explicit mention → hand-raise picks best respondent.
        set({ isEvaluatingHands: true });
        const raises = await collectHandRaises(useApiStore.getState().config, {
          topicOrMessage: trimmed,
          history: get().messages,
          activePersonas: personas,
          tone: get().tone,
          signal: abortController.signal,
        });
        set({ isEvaluatingHands: false, handRaises: raises });
        const winner = [...raises]
          .filter((r) => r.wantsToSpeak)
          .sort((a, b) => b.confidence - a.confidence)[0];
        const persona =
          getPersonaById(winner?.personaId ?? "") ??
          personas[0];
        await debateLock.run(async () => {
          await streamAssistantTurn({
            persona,
            signal: abortController!.signal,
            messages: [
              { role: "system", content: personaSystemPrompt(persona, personas, get().tone, "chat") },
              ...get()
                .messages.slice(-14)
                .map((m) => ({
                  role: m.role === "user" ? ("user" as const) : ("assistant" as const),
                  content: m.content,
                })),
            ],
          });
        });
      }
    } catch (err) {
      const aborted =
        err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        set({
          error: err instanceof Error ? err.message : "Unknown LLM error",
        });
      }
      set((s) => ({
        messages: s.messages.map((m) => ({ ...m, streaming: false })),
        speakingPersonaId: null,
      }));
    } finally {
      set({ isBusy: false, isEvaluatingHands: false });
      abortController = null;
    }
  },

  startDebate: async () => {
    if (get().isBusy) return;
    const topic = get().topic.trim();
    if (!topic) {
      set({ error: "Set a debate topic in the Topic Controller." });
      return;
    }
    const { activeIds } = usePersonaStore.getState();
    const personas = activeIds
      .map(getPersonaById)
      .filter((p): p is Persona => Boolean(p));
    if (personas.length < 2) {
      set({ error: "Activate at least 2 personas to start a debate." });
      return;
    }

    abortController = new AbortController();
    const signal = abortController.signal;
    set({
      isBusy: true,
      isEvaluatingHands: true,
      error: null,
      messages: [...get().messages, buildUserMessage(`🎤 Debate topic: ${topic}`)],
    });

    try {
      const raises = await collectHandRaises(useApiStore.getState().config, {
        topicOrMessage: topic,
        history: get().messages,
        activePersonas: personas,
        tone: get().tone,
        signal,
      });
      const queue = raises
        .filter((r) => r.wantsToSpeak && r.confidence >= 0.35)
        .sort((a, b) => b.confidence - a.confidence);
      const finalQueue =
        queue.length > 0 ? queue : raises.sort((a, b) => b.confidence - a.confidence).slice(0, 2);

      set({ isEvaluatingHands: false, handRaises: raises, queueOrder: finalQueue.map((q) => q.personaId) });

      const priorTurns: { role: "user"; content: string }[] = [];
      for (const raise of finalQueue) {
        if (signal.aborted) break;
        const personaId = raise.personaId;
        set((s) => ({ queueOrder: s.queueOrder.filter((id) => id !== personaId) }));
        await debateLock.run(async () => {
          const turnMessages: { role: "user"; content: string }[] = priorTurns.map((t) => ({
            role: "user",
            content: t.content,
          }));
          let streamed = "";
          for await (const delta of runDebateTurn(
            {
              config: useApiStore.getState().config,
              topic,
              history: get().messages,
              activePersonas: personas,
              tone: get().tone,
              signal,
            },
            personaId,
            turnMessages
          )) {
            streamed += delta;
            set((s) => {
              const existing = s.messages.find(
                (m) => m.streaming && m.personaId === personaId
              );
              if (existing) {
                return {
                  messages: s.messages.map((m) =>
                    m.id === existing.id ? { ...m, content: streamed } : m
                  ),
                };
              }
              return {
                messages: [
                  ...s.messages,
                  {
                    id: nextId(),
                    role: "assistant",
                    personaId,
                    content: streamed,
                    timestamp: Date.now(),
                    streaming: true,
                  },
                ],
              };
            });
          }
          set((s) => {
            const suggestions = extractSuggestions(streamed);
            const clean = stripSuggestionTags(streamed);
            return {
              queueOrder: s.queueOrder,
              messages: s.messages.map((m) =>
                m.streaming && m.personaId === personaId
                  ? {
                      ...m,
                      content: clean || streamed,
                      streaming: false,
                      suggestions,
                    }
                  : m
              ),
            };
          });
          priorTurns.push({
            role: "user",
            content: `DEBATE TURN by ${getPersonaById(personaId)?.name}: ${streamed}`,
          });
        });
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if (!aborted) {
        set({ error: err instanceof Error ? err.message : "Debate failed" });
      }
      set((s) => ({
        messages: s.messages.map((m) => ({ ...m, streaming: false })),
        speakingPersonaId: null,
      }));
    } finally {
      set({ isBusy: false, isEvaluatingHands: false });
      abortController = null;
    }
  },
}));
