"use client";

import { create } from "zustand";
import type { ChatCompletionMessage } from "@/lib/llm-client";
import { streamChatCompletion } from "@/lib/llm-client";
import { ThinkingFilter } from "@/lib/thinking-filter";
import type { ChatMessage, HandRaise, Persona } from "@/types";
import { useApiStore } from "./useApiStore";
import { getPersonaById, usePersonaStore } from "./usePersonaStore";
import {
  collectHandRaises,
  debateTurnMessages,
  personaSystemPrompt,
  StreamLock,
  type DebateTone,
} from "@/lib/debate-orchestrator";
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

/**
 * Streams one assistant turn into a chat bubble. Reasoning-model output
 * (<think> blocks / reasoning_content deltas) is filtered out of the
 * visible text and surfaced as a "thinking" indicator instead. If the
 * provider ignored streaming and returned the whole answer at once, it is
 * revealed with a typewriter effect so the UI still feels live.
 */
async function runAssistantStream(params: {
  personaId: string;
  messages: ChatCompletionMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  const { personaId, messages, signal } = params;
  const messageId = nextId();
  const placeholder: ChatMessage = {
    id: messageId,
    role: "assistant",
    personaId,
    content: "",
    timestamp: Date.now(),
    streaming: true,
  };
  useChatStore.setState((s) => ({
    messages: [...s.messages, placeholder],
    speakingPersonaId: personaId,
  }));

  const patch = (p: Partial<ChatMessage>) =>
    useChatStore.setState((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...p } : m)),
    }));

  const filter = new ThinkingFilter();
  let full = "";
  let pendingFirstChunk: string | null = null;
  let live = false;

  try {
    for await (const delta of streamChatCompletion(
      useApiStore.getState().config,
      messages,
      signal
    )) {
      if (signal?.aborted) break;

      if (delta.reasoning) {
        patch({ thinking: true });
        continue;
      }

      const visible = delta.content ? filter.push(delta.content) : "";
      if (!visible) {
        if (filter.thinking) patch({ thinking: true });
        continue;
      }

      // Hold back the very first chunk: if nothing else follows, the
      // provider didn't really stream and we typewriter-reveal instead.
      if (!live) {
        if (pendingFirstChunk === null) {
          pendingFirstChunk = visible;
          continue;
        }
        full += pendingFirstChunk;
        pendingFirstChunk = null;
        live = true;
      }
      full += visible;
      patch({ content: full, thinking: false });
    }

    let tail = filter.end();
    if (pendingFirstChunk !== null) tail = pendingFirstChunk + tail;

    if (!live && tail) {
      const step = Math.max(2, Math.ceil(tail.length / 160));
      for (let i = step; i < tail.length; i += step) {
        if (signal?.aborted) break;
        full = tail.slice(0, i);
        patch({ content: full, thinking: false });
        await new Promise((r) => setTimeout(r, 12));
      }
      full = tail;
      patch({ content: full, thinking: false });
    } else if (tail) {
      full += tail;
      patch({ content: full, thinking: false });
    }
  } finally {
    const clean = stripSuggestionTags(full);
    const suggestions = extractSuggestions(full);
    patch({
      content: clean || full,
      streaming: false,
      thinking: false,
      suggestions,
    });
    useChatStore.setState({ speakingPersonaId: null });
  }
  return stripSuggestionTags(full) || full;
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

    const historyFor = (limit: number): ChatCompletionMessage[] =>
      get()
        .messages.slice(-limit)
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content:
            m.role === "assistant"
              ? `${getPersonaById(m.personaId ?? "")?.name ?? "Assistant"} said: ${m.content}`
              : m.content,
        }));
    const systemFor = (persona: Persona) =>
      personaSystemPrompt(persona, personas, get().tone, "chat");

    try {
      const targets =
        mentions.length > 0
          ? mentions
          : [
              personas.length === 1
                ? personas[0]
                : await pickBestResponder({
                    trimmed,
                    history: get().messages,
                    personas,
                    tone: get().tone,
                    signal: abortController.signal,
                  }),
            ];

      for (const persona of targets) {
        if (abortController.signal.aborted) break;
        await debateLock.run(async () => {
          await runAssistantStream({
            personaId: persona.id,
            signal: abortController!.signal,
            messages: [
              { role: "system", content: systemFor(persona) },
              ...historyFor(14),
            ],
          });
        });
      }
    } catch (err) {
      handleLlmError(set, err, "Unknown LLM error");
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
        queue.length > 0
          ? queue
          : [...raises].sort((a, b) => b.confidence - a.confidence).slice(0, 2);

      set({
        isEvaluatingHands: false,
        handRaises: raises,
        queueOrder: finalQueue.map((q) => q.personaId),
      });

      const priorTurns: ChatCompletionMessage[] = [];
      for (const raise of finalQueue) {
        if (signal.aborted) break;
        const personaId = raise.personaId;
        set((s) => ({ queueOrder: s.queueOrder.filter((id) => id !== personaId) }));
        await debateLock.run(async () => {
          const streamed = await runAssistantStream({
            personaId,
            signal,
            messages: debateTurnMessages(
              {
                config: useApiStore.getState().config,
                topic,
                history: get().messages,
                activePersonas: personas,
                tone: get().tone,
                signal,
              },
              personaId,
              priorTurns
            ),
          });
          priorTurns.push({
            role: "user",
            content: `DEBATE TURN by ${getPersonaById(personaId)?.name}: ${streamed}`,
          });
        });
      }
    } catch (err) {
      handleLlmError(set, err, "Debate failed");
    } finally {
      set({ isBusy: false, isEvaluatingHands: false });
      abortController = null;
    }
  },
}));

function handleLlmError(
  set: (partial: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => void,
  err: unknown,
  fallback: string
) {
  const aborted = err instanceof DOMException && err.name === "AbortError";
  if (!aborted) {
    set({ error: err instanceof Error ? err.message : fallback });
  }
  set((s) => ({
    messages: s.messages.map((m) => ({ ...m, streaming: false, thinking: false })),
    speakingPersonaId: null,
  }));
}

/** Hand-raise evaluation to pick a respondent when several personas are active. */
async function pickBestResponder(args: {
  trimmed: string;
  history: ChatMessage[];
  personas: Persona[];
  tone: DebateTone;
  signal: AbortSignal;
}): Promise<Persona> {
  useChatStore.setState({ isEvaluatingHands: true });
  const raises = await collectHandRaises(useApiStore.getState().config, {
    topicOrMessage: args.trimmed,
    history: args.history,
    activePersonas: args.personas,
    tone: args.tone,
    signal: args.signal,
  });
  useChatStore.setState({ isEvaluatingHands: false, handRaises: raises });
  const winner = [...raises]
    .filter((r) => r.wantsToSpeak)
    .sort((a, b) => b.confidence - a.confidence)[0];
  return (
    getPersonaById(winner?.personaId ?? "") ?? args.personas[0]
  );
}
