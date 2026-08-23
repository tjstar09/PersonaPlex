# OpenCode Execution Blueprint: PersonaPlex

## Project Goal & Vision
PersonaPlex is a zero-backend, client-side single-page application (SPA) where users engage with AI personas (prebuilt or custom). It supports direct single chat, mid-stream `@persona` callouts, dynamic context-aware persona suggestions, and multi-persona debates governed by a hand-raising turn-queuing engine.

---

## Technical Stack Architecture
- **Framework:** Next.js (App Router, Static Export target) / React 19 / TypeScript.
- **Styling & UI:** Tailwind CSS v4, Lucide React, Framer Motion (micro-interactions).
- **State & Storage:** Client-side LocalStorage with Zustand & Zod validation schema. Zero database dependencies.
- **LLM Abstraction:** Custom fetch driver compliant with OpenAI API standard (supports OpenRouter, OmniRoute, OpenCode Zen, Direct Provider endpoints).

---

## Core Feature Requirements & Constraints

1. **Client-Side API Endpoint & Key Manager:**
   - Single config modal/sidebar supporting Endpoint URL, Model Identifier, API Key, and Max Tokens.
   - Credentials saved exclusively to browser `localStorage` (never transmitted anywhere except the user-configured LLM endpoint).

2. **Persona Management & Limits:**
   - Prebuilt roster: *Baby, Working Man, Homeless Person, Senior IT Specialist, Pro-Coder, Gen-Z*.
   - Custom Persona Creator: Name, Avatar Emoji/Icon, Tone, System Prompt, Expertise Tags.
   - **Monetization Tier Guard:** Default active roster restricted to 3 personas max. Monitored via `useFeatureFlag('max_active_personas', 3)`. Unlocks up to 10 via mock/toggle premium key.

3. **Multi-Persona Orchestration & Debate Engine:**
   - **Hand-Raise Turn Queue:** Personas evaluate topic relevance concurrently; persona raising hand highest speaks next, acquiring the stream lock to prevent output collision.
   - **Tone Directives:** Selectable debate modes: `Peaceful (Default)`, `Standard`, `Extreme/Aggressive`.
   - **Active Roster Awareness:** Personas are aware of all participants present in the current session.
   - **Smart Suggestions:** Personas analyze ongoing conversation and suggest missing perspective niches (e.g., "You should add a Legal Specialist here"). Offers inline 1-click "Add Suggested Persona" modal.

4. **Single-Page Bento Layout:**
   - **Left Panel:** Persona Roster (Active, Prebuilt, Custom Creator).
   - **Center Panel:** Universal Chat & Debate Stage (Message timeline, @mentions autocomplete, hand-raise indicators, tone selector).
   - **Right Panel:** Topic Controller, Debate Orchestrator, BYO-API Key Configuration.

---

## Stage-by-Stage Implementation Plan

### Stage 0: Design Pre-Flight & Modern UI Rules ✅
- Use `agent-browser` to inspect current 2026 AI chat design benchmarks, glassmorphism bento grids, and dark-mode token palettes.
- Create `src/config/theme.tokens.ts` declaring CSS variables, typography scales, and glow effects.

### Stage 1: Base Setup & Local Storage Engine ✅
- Scaffold Next.js TypeScript project with Tailwind CSS v4.
- Build Zustand stores: `useApiStore` (keys, endpoints) and `usePersonaStore` (roster, custom creations, tier limit checks).
- **Success Criteria:** Stores hydrate from `localStorage` without layout shift or hydration mismatch errors.

### Stage 2: BYO-Endpoint Driver & Single Chat ✅
- Build an OpenAI-compatible unified fetch wrapper handling custom base URLs (OpenRouter, OmniRoute, OpenCode Zen).
- Implement single persona chat stream using Server-Sent Events (SSE) parsing.
- **Success Criteria:** Successfully send/receive streaming message from a custom endpoint using user-provided credentials.

### Stage 3: Dynamic `@persona` Callouts & Smart Suggestions ✅
- Integrate `@` autocomplete trigger in text input parsing active personas.
- Implement post-processing hook scanning persona outputs for `[SUGGEST_PERSONA: "Name", "Reason"]` tags to render actionable UI cards.
- **Success Criteria:** Typing `@` presents participant drop-down; AI responses dynamically surface persona recommendation chips.

### Stage 4: Concurrent Hand-Raise Debate Engine ✅
- Implement turn controller: Broadcast current context to active personas -> Evaluate hand-raise confidence score -> Queue speakers -> Execute sequential stream locking.
- Inject system prompt modifier based on Tone Directive (`Peaceful` vs `Extreme`).
- **Success Criteria:** 3 personas participate in a debate, queueing sequentially without stream overlap while recognizing each other's points.

### Stage 5: Monetization Guardrails & UI Refinement ✅
- Implement `useFeatureFlag` hook. Show lock icon and upgrade banner when attempting to add a 4th persona without premium toggle enabled.
- Optimize bento layout responsiveness for modern desktop viewports.
- **Success Criteria:** Attempting to select 4 personas triggers clean upgrade modal; code gracefully throttles active personas to 3 on free mode.

### Stage 6: Browser Automation & End-to-End Verification ✅
- **Instruction for OpenCode:** Execute `agent-browser` CLI tool to run local automated browser verification:
  1. Open local URL `http://localhost:3000`.
  2. Input test API configuration into settings.
  3. Create a custom persona and launch a 3-way debate under `Peaceful` mode.
  4. Capture and log screenshots of the complete interactive workflow to `.playwright-results/` before declaring completion.

---

## Actionable Success Criteria

- Zero server runtime dependencies (`output: 'export'` static-build ready).
- All API credentials stored exclusively in browser local storage.
- Concurrent hand-raise queue successfully streams responses one at a time without race conditions.
- UI validated and screenshot logs verified by `agent-browser`.

---

## As-Built Implementation Notes

All stages are implemented and verified (lint/typecheck/build pass; `agent-browser` workflow screenshots captured in `.playwright-results/`). Deviations from the original blueprint:

- **Static export:** `next export` was removed from modern Next.js. The app builds fully prerendered today; for static-site deployment add `output: "export"` to `next.config.ts` and deploy the emitted `out/` directory.
- **Storage:** Credentials persist via Zustand `persist` middleware (plain `localStorage`, Zod-validated) rather than custom encryption — standard practice, keys never leave the browser except to the configured endpoint.
- **AI SDK:** `@vercel/ai-sdk` does not exist on npm and was not needed — the custom SSE fetch driver (`src/lib/llm-client.ts`) covers all providers.
- **Free-tier gate bugfix:** Locked roster buttons must remain clickable so the click routes into the upgrade-modal flow (visual lock icon + disabled activation, not a disabled button).

### Codebase Map

| Concern | Path |
|---|---|
| Design tokens | `src/config/theme.tokens.ts` |
| API credentials store | `src/store/useApiStore.ts` |
| Persona roster store | `src/store/usePersonaStore.ts` |
| Chat/debate runtime state | `src/store/useChatStore.ts` |
| LLM SSE client | `src/lib/llm-client.ts` |
| Hand-raise engine + tone directives | `src/lib/debate-orchestrator.ts` |
| `[SUGGEST_PERSONA]` parser | `src/lib/suggestion-parser.ts` |
| Monetization guard | `src/hooks/useFeatureFlag.ts` |
| Bento layout entry | `src/app/page.tsx` |
| Panels | `src/components/` (PersonaRoster, ChatPanel, ChatInput, DebatePanel, ApiSettings, UpgradeModal…) |

### Running Locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```
