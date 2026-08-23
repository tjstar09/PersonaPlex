// Reasoning models mark chain-of-thought in several shapes. We match raw
// text directly (never rewriting), so tags split across stream chunks or
// HTML-escaped by providers are still caught.
const OPENS = [
  "<think>",
  "<thinking>",
  "<reasoning>",
  "&lt;think&gt;",
  "&lt;thinking&gt;",
  "&lt;reasoning&gt;",
];

const CLOSES = [
  "</think>",
  "</thinking>",
  "</reasoning>",
  "&lt;/think&gt;",
  "&lt;/thinking&gt;",
  "&lt;/reasoning&gt;",
];

interface TokenHit {
  index: number;
  length: number;
}

function findEarliest(buf: string, tokens: string[]): TokenHit | null {
  let best: TokenHit | null = null;
  for (const token of tokens) {
    const idx = buf.indexOf(token);
    if (idx !== -1 && (best === null || idx < best.index)) {
      best = { index: idx, length: token.length };
    }
  }
  return best;
}

function partialSuffixLength(buf: string, tokens: string[]): number {
  const maxLen = Math.max(...tokens.map((t) => t.length));
  for (let len = Math.min(maxLen - 1, buf.length); len > 0; len--) {
    const suffix = buf.slice(-len);
    if (tokens.some((t) => t.startsWith(suffix))) return len;
  }
  return 0;
}

/** Remove complete and unterminated think blocks from finished text. */
export function stripThinkBlocks(text: string): string {
  const filter = new ThinkingFilter();
  return filter.push(text).concat(filter.end()).trimStart();
}

/**
 * Incrementally filters reasoning-model chain-of-thought out of a token
 * stream. Holds back partial tag fragments across chunk boundaries.
 */
export class ThinkingFilter {
  private inThink = false;
  private buf = "";

  /** Feed a raw chunk; returns only the visible text. */
  push(chunk: string): string {
    this.buf += chunk;
    let out = "";
    while (this.buf.length > 0) {
      if (!this.inThink) {
        const open = findEarliest(this.buf, OPENS);
        if (!open) {
          const keep = partialSuffixLength(this.buf, OPENS);
          out += this.buf.slice(0, this.buf.length - keep);
          this.buf = this.buf.slice(this.buf.length - keep);
          break;
        }
        out += this.buf.slice(0, open.index);
        this.buf = this.buf.slice(open.index + open.length);
        this.inThink = true;
      } else {
        const close = findEarliest(this.buf, CLOSES);
        if (!close) {
          const keep = partialSuffixLength(this.buf, CLOSES);
          this.buf = this.buf.slice(this.buf.length - keep);
          break;
        }
        this.buf = this.buf.slice(close.index + close.length);
        this.inThink = false;
      }
    }
    return out;
  }

  /** Flush any held-back text once the stream has ended. */
  end(): string {
    if (!this.inThink) {
      const rest = this.buf;
      this.buf = "";
      return rest;
    }
    this.buf = "";
    return "";
  }

  get thinking(): boolean {
    return this.inThink;
  }
}
