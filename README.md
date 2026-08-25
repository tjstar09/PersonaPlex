# 🎭 PersonaPlex

```text
░       ░░░        ░░       ░░░░      ░░░░      ░░░   ░░░  ░░░      ░░░       ░░░  ░░░░░░░░        ░░  ░░░░  ░
▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒  ▒▒    ▒▒  ▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒  ▒▒  ▒▒
▓       ▓▓▓      ▓▓▓▓       ▓▓▓▓      ▓▓▓  ▓▓▓▓  ▓▓  ▓  ▓  ▓▓  ▓▓▓▓  ▓▓       ▓▓▓  ▓▓▓▓▓▓▓▓      ▓▓▓▓▓▓    ▓▓▓
█  ████████  ████████  ███  █████████  ██  ████  ██  ██    ██        ██  ████████  ████████  █████████  ██  ██
█  ████████        ██  ████  ███      ████      ███  ███   ██  ████  ██  ████████        ██        ██  ████  █
```

**A zero-backend, client-side AI persona chat & debate stage.** Bring your own
OpenAI-compatible API key (OpenRouter, gateways, direct providers), assemble a
roster of AI personas, and run everything from casual 1-on-1 chats to fully
moderated multi-persona debates — 100% in your browser. No server, no database,
keys never leave your localStorage.

[🚀 **Launch PersonaPlex Live**](https://tjstar09.github.io/PersonaPlex/) →

---

## ✨ Features

- 🗣️ **Direct chat** with any active persona, `@Name` mid-stream callouts, and automatic hand-raise selection when several personas are listening
- ⚔️ **Debate engine** — concurrent hand-raise evaluation, confidence-scored speaker queue, stream-locked turns (personas never talk over each other)
- 🎙️ **Moderator controls** — steer live debates (see playbook below)
- 🧠 **Reasoning-model safe** — `<think>` blocks and chain-of-thought are stripped; you see only in-character speech
- 🏷️ **Smart suggestions** — personas recommend missing perspectives; one click adds *and* activates them mid-conversation
- 📤 **Transcript export** — Markdown (full/clean), lossless JSON, print-to-PDF
- 🔐 **Promo codes** — 7-day premium trials, per-device single-use, globally revocable
- 🧩 **15 prebuilt personas** + custom persona creator with ✨ AI enhancement

---

## 🚀 Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
```

1. Open **BYO API Configuration** (right panel) → paste endpoint URL, model, API key → **Save** (stored only in your browser)
2. Activate personas in the left roster (free tier: 3 · premium: 10)
3. Type a message — or set a topic and **Launch Debate**

---

## 🎙️ The Moderator Playbook

As the user, **you are the moderator**. Personas argue; you control the floor,
the temperature, and the ending. Here is every power, with what actually gets
injected behind the scenes.

### Before the debate

| Power | How | Example |
|---|---|---|
| **Set the topic** | Topic Controller textarea | `Should AI vote on behalf of their users?` |
| **Set the tone** | Tone Directive buttons | `🕊️ Peaceful` · `⚔️ Standard` · `🔥 Extreme` — the same directive text is appended to *every* persona's prompt, so one click changes the whole room's temperature |
| **Pick the cast** | Activate 2–10 personas | Roster awareness means each persona knows exactly who else is at the table |

### During the debate — the 7 Moderator Controls

Each control posts a visible **🎤 Moderator** line into the transcript, injects
the matching directive into the next hand-raise round, and re-runs the
confidence-scored speaker queue.

| Control | Injected directive (verbatim) | Use it when… |
|---|---|---|
| ➕ **Continue** | *"Continue the debate: advance your argument one concrete step further. No repetition of earlier points."* | The opening round was good — keep it going without repetition |
| 🏁 **Conclude** | *"CLOSING STATEMENT: Give your final word on this topic — your strongest closing punch, then stop. Max 60 words."* | You want it to end. Closing statements run, then the Moderator posts a synthesized **🏁 VERDICT** summarizing where each side landed |
| ❓ **Probe** | *"A probing question just hit the floor: name the weakest assumption made so far (yours included) and address it head-on."* | Everyone is talking past each other; force first-principles honesty |
| 🔥 **Heat** | *"TEMPERATURE RISING: The crowd is jeering. Escalate — sharper, more personal, twice as theatrical (never slurs). Double down harder than before."* | A polite debate needs sparks. Pairs beautifully with the Extreme tone |
| 🕊️ **Peace** | *"COOL-OFF CALLED: Find genuine common ground with your opponent. Acknowledge one thing they got right, then propose ONE shared conclusion you could both sign."* | Things got too spicy; steer toward synthesis |
| 🍿 **Popcorn** | *"POPCORN MODE: One-liner roast round. Max 25 words. Pure wit over substance — make the audience laugh at the other side's expense."* | Comic relief. The speak threshold drops to 15% so *everyone* jumps in |
| 🎲 **Twist** | *"PLOT TWIST: A breaking development has just changed the situation. Invent a surprising but plausible twist relevant to the topic and react to it in character."* | Stalemate. Watch personas improvise around a curveball |

### Example: a moderated exchange

```text
👤 You:            🎤 Debate topic: Is remote work the future?
📈 The Macro-Economist   [hand-raise 91% — QUEUED]
   "Office real estate is a $30T bet against productivity…"
💼 (Working Man)         [hand-raise 84% — QUEUED]
   "My commute is 90 minutes. My mortgage doesn't care about vibes…"

🎤 Moderator — TEMPERATURE RISING:        ← you clicked 🔥 Heat
🔥 (personas escalate, twice as sharp)

🎤 Moderator — CLOSING STATEMENT:         ← you clicked 🏁 Conclude
   …each persona delivers a ≤60-word closer…

🎤 Moderator
   🏁 VERDICT: Both camps converged on hybrid models; the real fight
   is over who pays for the home office…
```

### Moderator powers beyond the buttons

- 🖐️ **Read the room** — the Hand-Raise Queue shows each persona's confidence % and a 12-word preview of their intended angle before they speak
- 📣 **Direct the floor** — `@The Zen Practitioner` in the input forces a specific persona to respond
- 🔁 **Retry hiccups** — failed turns show an inline Retry button (rate-limits are also auto-retried)
- ➕ **Recruit mid-debate** — click a `[SUGGEST_PERSONA]` card or add from the roster; a muted *"✨ X joined the conversation"* line marks the moment, and they're eligible from the next round
- 🎚️ **Flip the tone between rounds** — Peaceful → Extreme mid-debate re-arms every persona's directive
- 🛑 **Stop** — kills active streams instantly (per-turn Retry still available)
- 📤 **Export the record** — Markdown/JSON/PDF of the full session, moderator lines and verdict included

---

## 📚 More Documentation

- [`PERSONAS.md`](./PERSONAS.md) — the 15-persona library + authoring guide (WHO/DIGEST/THINK/OUTPUT schema)
- [`AGENTS.md`](./AGENTS.md) — architecture blueprint & as-built notes

## 🔒 Privacy

Everything runs in your browser: conversations, personas, and API credentials
live in `localStorage` and are transmitted **only** to the LLM endpoint you
configure. There is no PersonaPlex server.

<!-- Screenshots: coming soon -->
