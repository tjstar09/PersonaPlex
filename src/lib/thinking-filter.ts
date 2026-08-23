const OPEN = "<think>";
const CLOSE = "</think>";

/** Remove complete and unterminated <think>…</think> blocks from finished text. */
export function stripThinkBlocks(text: string): string {
  return text
    .replace(new RegExp(`${OPEN}[\\s\\S]*?${CLOSE}`, "g"), "")
    .replace(new RegExp(`${OPEN}[\\s\\S]*$`), "")
    .trimStart();
}

/**
 * Incrementally filters reasoning-model <think> blocks out of a token
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
        const openIdx = this.buf.indexOf(OPEN);
        if (openIdx === -1) {
          const keep = this.partialSuffix(this.buf, OPEN);
          out += this.buf.slice(0, this.buf.length - keep);
          this.buf = this.buf.slice(this.buf.length - keep);
          break;
        }
        out += this.buf.slice(0, openIdx);
        this.buf = this.buf.slice(openIdx + OPEN.length);
        this.inThink = true;
      } else {
        const closeIdx = this.buf.indexOf(CLOSE);
        if (closeIdx === -1) {
          const keep = this.partialSuffix(this.buf, CLOSE);
          this.buf = this.buf.slice(this.buf.length - keep);
          break;
        }
        this.buf = this.buf.slice(closeIdx + CLOSE.length);
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

  private partialSuffix(buf: string, tag: string): number {
    for (let len = Math.min(tag.length - 1, buf.length); len > 0; len--) {
      if (buf.endsWith(tag.slice(0, len))) return len;
    }
    return 0;
  }
}
