export const REPLY_OPEN = "<reply>";
export const REPLY_CLOSE = "</reply>";

type Phase = "pre" | "in" | "done";

/**
 * Streaming-aware extractor for the hard <reply>…</reply> output protocol.
 * Everything outside the envelope (plain-text chain-of-thought, prompt
 * echoes, meta commentary) is discarded by construction.
 *
 * Graceful degradation: if the stream ends and no <reply> tag was ever
 * found, the ENTIRE raw text is treated as the reply — a model ignoring
 * the protocol still gets shown instead of vanishing.
 */
export class ReplyEnvelopeFilter {
  private raw = "";
  private pos = 0;
  private phase: Phase = "pre";
  private sawOpenTag = false;

  /** Feed a raw chunk; returns visible reply text revealed so far. */
  push(chunk: string): string {
    this.raw += chunk;
    return this.drain(false);
  }

  /** Flush remaining text once the stream has ended. */
  end(): string {
    return this.drain(true);
  }

  /** 'pre' = before envelope opens (model is reasoning), 'in' = inside reply. */
  get state(): Phase {
    return this.phase;
  }

  private drain(finished: boolean): string {
    let out = "";
    while (true) {
      if (this.phase === "pre") {
        const idx = this.raw.indexOf(REPLY_OPEN, this.pos);
        if (idx !== -1) {
          this.pos = idx + REPLY_OPEN.length;
          this.phase = "in";
          this.sawOpenTag = true;
          continue;
        }
        if (finished && !this.sawOpenTag) {
          // Fallback: model ignored the protocol entirely — everything
          // buffered so far was pre-envelope text, so show all of it.
          this.pos = this.raw.length;
          this.phase = "done";
          return out + this.raw;
        }
        // Discard everything except a possible partial "<repl…" at the
        // tail — pre-envelope content is chain-of-thought, never shown.
        this.pos = Math.max(
          this.pos,
          this.raw.length - (REPLY_OPEN.length - 1)
        );
        return out;
      }

      if (this.phase === "in") {
        const idx = this.raw.indexOf(REPLY_CLOSE, this.pos);
        if (idx !== -1) {
          out += this.raw.slice(this.pos, idx);
          this.pos = this.raw.length;
          this.phase = "done";
          return out;
        }
        const tailStart = Math.max(
          this.pos,
          this.raw.length - (REPLY_CLOSE.length - 1)
        );
        if (finished) {
          const rest = this.raw.slice(this.pos);
          this.pos = this.raw.length;
          this.phase = "done";
          return out + rest;
        }
        out += this.raw.slice(this.pos, tailStart);
        this.pos = tailStart;
        return out;
      }

      return out;
    }
  }
}
