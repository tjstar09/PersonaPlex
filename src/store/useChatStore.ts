"use client";

import { create } from "zustand";
import type { ChatCompletionMessage } from "@/lib/llm-client";
import { completeChat, streamChatCompletion } from "@/lib/llm-client";
import { ThinkingFilter, stripThinkBlocks } from "@/lib/thinking-filter";
import { ReplyEnvelopeFilter } from "@/lib/reply-envelope";
import type { ChatMessage, HandRaise, Persona } from "@/types";
import { useApiStore } from "./useApiStore";
import { getPersonaById, usePersonaStore } from "./usePersonaStore";
import {
  collectHandRaises,
  debateTurnMessages,
  MODERATOR_DIRECTIVES,
  personaSystemPrompt,
  StreamLock,
  type DebateTone,
  type ModeratorAction,
} from "@/lib/debate-orchestrator";
import { extractSuggestions, stripSuggestionTags } from "@/lib/suggestion-parser";

const debateLock = new StreamLock();
let abortController: AbortController | null = null;
let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

/** Request params kept per message so a failed turn can be retried. */
const turnRegistry = new Map<
  string,
  { personaId: string; messages: ChatCompletionMessage[] }
>();

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
  moderate: (action: ModeratorAction) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  stop: () => void;
}

/**
 * Streams one assistant turn into a chat bubble.
 * Layer 1 discards everything outside the <reply> envelope; layer 2 strips
 * residual <think> blocks; reasoning deltas surface a "thinking" pill.
 * Empty replies are retried once with a nudge; persistent failures mark the
 * bubble `failed` so the user can hit Retry.
 */
async function runAssistantStream(params: {
  personaId: string;
  messages: ChatCompletionMessage[];
  signal?: AbortSignal;
  existingId?: string;
}): Promise<string> {
  const { personaId, messages, signal, existingId } = params;

  const messageId = existingId ?? nextId();
  if (!existingId) {
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
  } else {
    patchMessage(messageId, { streaming: true, thinking: false, failed: false, content: "" });
    useChatStore.setState({ speakingPersonaId: personaId });
  }

  turnRegistry.set(messageId, { personaId, messages });

  const patch = (p: Partial<ChatMessage>) => patchMessage(messageId, p);

  const attempt = async (attemptMessages: ChatCompletionMessage[]): Promise<string> => {
    const filter = new ThinkingFilter();
    const envelope = new ReplyEnvelopeFilter();
    let full = "";
    let pendingFirstChunk: string | null = null;
    let live = false;

    for await (const delta of streamChatCompletion(
      useApiStore.getState().config,
      attemptMessages,
      signal
    )) {
      if (signal?.aborted) break;

      if (delta.reasoning) {
        patch({ thinking: true });
        continue;
      }
      if (!delta.content) continue;

      // Layer 1: discard everything outside the <reply> envelope.
      const enveloped = envelope.push(delta.content);
      if (!enveloped) {
        if (envelope.state === "pre") patch({ thinking: true });
        continue;
      }

      // Layer 2: strip any residual <think> blocks inside the reply.
      const visible = filter.push(enveloped);
      if (!visible) {
        if (filter.thinking || envelope.state === "pre") patch({ thinking: true });
        continue;
      }

      if (!live) {
        // Hold back the first chunk to detect one-shot (non-stream) payloads.
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

    let tail = filter.push(envelope.end()) + filter.end();
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
    return full.trim();
  };

  let text = "";
  try {
    text = await attempt(messages);
    if (text === "" && !signal?.aborted) {
      // One automatic retry with an explicit nudge before giving up.
      patch({ thinking: false, content: "" });
      const nudged: ChatCompletionMessage[] = [
        ...messages,
        {
          role: "user",
          content:
            'Your previous reply was empty. Respond now as your persona — remember the <reply> </reply> wrapper.',
        },
      ];
      turnRegistry.set(messageId, { personaId, messages: nudged });
      text = await attempt(nudged);
    }
  } catch (err) {
    patch({ streaming: false, thinking: false, failed: true });
    throw err;
  }

  if (text === "") {
    // Still empty after retry — leave a retryable failed bubble, no toast.
    patch({ streaming: false, thinking: false, failed: true, content: "" });
    return "";
  }

  const clean = stripSuggestionTags(stripThinkBlocks(text)) || text;
  patch({
    content: clean,
    streaming: false,
    thinking: false,
    failed: false,
    suggestions: extractSuggestions(text),
  });
  useChatStore.setState({ speakingPersonaId: null });
  turnRegistry.delete(messageId);
  return clean;
}

function patchMessage(id: string, p: Partial<ChatMessage>) {
  useChatStore.setState((s) => ({
    messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)),
  }));
}

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
    messages: s.messages.map((m) =>
      m.streaming ? { ...m, streaming: false, thinking: false } : m
    ),
    speakingPersonaId: null,
  }));
}

function activePersonasOf(): Persona[] {
  const { activeIds } = usePersonaStore.getState();
  return activeIds.map(getPersonaById).filter((p): p is Persona => Boolean(p));
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
    set({
      isBusy: false,
      isEvaluatingHands: false,
      speakingPersonaId: null,
      queueOrder: [],
    });
    set((s) => ({
      messages: s.messages.map((m) =>
        m.streaming ? { ...m, streaming: false, thinking: false } : m
      ),
    }));
  },

  sendDirect: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().isBusy) return;
    const personas = activePersonasOf();
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
    const personas = activePersonasOf();
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
      await runHandRaiseRound(set, get, signal, personas, topic, undefined, undefined);
    } catch (err) {
      handleLlmError(set, err, "Debate failed");
    } finally {
      set({ isBusy: false, isEvaluatingHands: false });
      abortController = null;
    }
  },

  moderate: async (action) => {
    if (get().isBusy) return;
    const topic = get().topic.trim();
    const personas = activePersonasOf();
    if (!topic || personas.length < 2) {
      set({ error: "Set a topic and activate at least 2 personas first." });
      return;
    }
    const directive = MODERATOR_DIRECTIVES[action];

    abortController = new AbortController();
    const signal = abortController.signal;
    set({ isBusy: true, error: null });

    try {
      set((s) => ({
        messages: [
          ...s.messages,
          buildUserMessage(`🎤 Moderator — ${directive.split(":")[0]}:`),
        ],
      }));

      await runHandRaiseRound(set, get, signal, personas, topic, directive, action);

      if (action === "conclude") {
        // Moderator synthesizes the final verdict from closing statements.
        const transcript = get()
          .messages.slice(-8)
          .map((m) => `${getPersonaById(m.personaId ?? "")?.name ?? (m.role === "user" ? "MODERATOR" : "?")}: ${m.content}`)
          .join("\n");
        const verdict = await completeChat(useApiStore.getState().config, [
          {
            role: "system",
            content:
              "You are a neutral, sharp-witted debate moderator. Summarize the debate outcome in max 80 words: where each side landed and what common ground (if any) emerged. No preamble.",
          },
          { role: "user", content: `Topic: ${topic}\n\nClosing transcript:\n${transcript}` },
        ], signal);
        const cleanVerdict = stripThinkBlocks(verdict).trim() || "The floor rests.";
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: nextId(),
              role: "assistant",
              personaId: "__moderator__",
              content: `🏁 VERDICT: ${cleanVerdict}`,
              timestamp: Date.now(),
            },
          ],
        }));
      }
    } catch (err) {
      handleLlmError(set, err, "Moderator action failed");
    } finally {
      set({ isBusy: false, isEvaluatingHands: false });
      abortController = null;
    }
  },

  retryMessage: async (messageId) => {
    const entry = turnRegistry.get(messageId);
    if (!entry || get().isBusy) return;
    const personas = activePersonasOf();
    if (personas.length === 0) {
      set({ error: "Activate at least one persona first." });
      return;
    }

    abortController = new AbortController();
    set({ isBusy: true, error: null });
    try {
      await debateLock.run(async () => {
        await runAssistantStream({
          personaId: entry.personaId,
          messages: entry.messages,
          signal: abortController!.signal,
          existingId: messageId,
        });
      });
    } catch (err) {
      handleLlmError(set, err, "Retry failed");
    } finally {
      set({ isBusy: false });
      abortController = null;
    }
  },
}));

/** One hand-raise evaluation → queued sequential turns. */
async function runHandRaiseRound(
  set: (partial: Partial<ChatState> | ((s: ChatState) => Partial<ChatState>)) => void,
  get: () => ChatState,
  signal: AbortSignal,
  personas: Persona[],
  topic: string,
  moderatorDirective: string | undefined,
  action: ModeratorAction | undefined
): Promise<void> {
  set({ isEvaluatingHands: true });
  const raises = await collectHandRaises(useApiStore.getState().config, {
    topicOrMessage: moderatorDirective ? `${topic}\n\nMODERATOR: ${moderatorDirective}` : topic,
    history: get().messages,
    activePersonas: personas,
    tone: get().tone,
    signal,
  });
  const threshold = action === "popcorn" ? 0.15 : 0.35;
  const queue = raises
    .filter((r) => r.wantsToSpeak && r.confidence >= threshold)
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
          priorTurns,
          moderatorDirective
        ),
      });
      if (streamed) {
        priorTurns.push({
          role: "user",
          content: `DEBATE TURN by ${getPersonaById(personaId)?.name}: ${streamed}`,
        });
      }
    });
  }
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
  return getPersonaById(winner?.personaId ?? "") ?? args.personas[0];
}
