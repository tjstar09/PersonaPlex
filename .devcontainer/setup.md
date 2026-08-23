# OpenCode Autonomous Setup & Execution Prompt: PersonaPlex

You are acting as the Lead AI Software Architect and Execution Agent. Your task is to initialize, build, and verify the "PersonaPlex" application from scratch inside this environment following the instructions below.

---

## INITIALIZATION PHASE

Before implementing feature modules, run the initial project scaffolding:

1. Check if `package.json` exists. If not, run:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

```

2. Install required core dependencies:
```bash
npm install zustand zod lucide-react framer-motion ai @vercel/ai-sdk

```



---

## PROJECT ARCHITECTURE & SPECIFICATIONS

* **App Goal:** A single-page AI persona chat and debate platform featuring direct chats, `@persona` mid-stream callouts, smart missing-persona suggestions, and concurrent multi-persona debates governed by a hand-raising turn queue.
* **Storage:** 100% client-side `localStorage` with zero backend database dependencies.
* **LLM Engine:** Universal OpenAI-compatible API driver supporting BYO key/endpoint (OpenRouter, OmniRoute, OpenCode Zen, OpenAI).
* **Monetization Safeguard:** Default active roster restricted to 3 personas via `useFeatureFlag('max_active_personas', 3)`. Up to 10 unlocked via premium toggle state.

---

## STAGE-BY-STAGE IMPLEMENTATION STEPS

### Stage 0: 2026 UI Pre-Flight & Design Tokens

* Use the `agent-browser` skill to review top 2026 AI chat UI patterns (dark mode, glassmorphism, bento grids).
* Create `src/config/theme.tokens.ts` containing CSS token variables, micro-interaction states, and color palettes.

### Stage 1: Client Storage & State Architecture

* Build `src/store/useApiStore.ts`: LocalStorage persistence for user API keys, base endpoint URLs, and default models.
* Build `src/store/usePersonaStore.ts`: Prebuilt personas (*Baby, Working Man, Homeless Person, Senior IT Specialist, Pro-Coder, Gen-Z*) + Custom persona creator store. Enforce 3-persona max active limit.

### Stage 2: BYO API Client & Single Chat Stream

* Create `src/lib/llm-client.ts`: Custom fetch stream wrapper compatible with OpenAI Chat Completions protocol.
* Build the main bento-grid chat layout (`src/app/page.tsx`).
* Implement chat streaming component with markdown and code block rendering.

### Stage 3: Dynamic `@persona` Callouts & Auto-Suggestions

* Add `@` mention trigger in the input textarea auto-completing available personas in the roster.
* Add response parser to scan outputs for `[SUGGEST_PERSONA: "Name", "Reason"]` tags and display 1-click "Add Suggested Persona" UI cards.

### Stage 4: Concurrent Hand-Raise Debate Engine

* Build `src/lib/debate-orchestrator.ts`:
1. Broadcast topic to active personas concurrently.
2. Evaluate hand-raise confidence score ($0.0 - 1.0$).
3. Queue speakers sequentially and enforce a stream lock so personas speak one at a time without race conditions.


* Support Tone Directives: `Peaceful (Default)`, `Standard`, and `Extreme`.

### Stage 5: Monetization Safeguards & UI Polish

* Create `src/hooks/useFeatureFlag.ts`. Show lock icon and upgrade modal when trying to select a 4th persona without premium toggle.
* Refine 3-column Bento layout:
* **Left Column:** Active Roster & Persona Creator
* **Center Column:** Main Chat / Debate Feed with Stream Controls
* **Right Column:** Topic Controller & API Settings Modal



### Stage 6: Browser Automation & Validation

* Start the Next.js dev server (`npm run dev`).
* Execute `agent-browser` CLI tool to test `http://localhost:3000`:
1. Open settings modal and save mock API credentials.
2. Select 3 personas and launch a debate under `Peaceful` tone.
3. Verify stream output and verify feature gate triggers when selecting a 4th persona.
4. Capture and log screenshots into `.playwright-results/`.



---

## BEGIN EXECUTION NOW

Read this entire document, execute the initialization commands, build Stages 0 through 6, and log completion screenshots before ending.