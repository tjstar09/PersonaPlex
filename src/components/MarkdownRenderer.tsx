"use client";

import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="text-foreground font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key}
          className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] font-mono text-accent-2"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = content.split(/```(\w*)\n?/);
  // blocks: [text, lang?, code?, text?, ...] when fenced code exists
  const parts: ReactNode[] = [];

  for (let i = 0; i < blocks.length; i += 2) {
    const text = blocks[i];
    const lang = blocks[i + 1];
    const code = blocks[i + 2];

    for (const [j, line] of text.split("\n").entries()) {
      if (!line.trim()) {
        parts.push(<div key={`sp-${i}-${j}`} className="h-2" />);
        continue;
      }
      parts.push(
        <p key={`p-${i}-${j}`} className="leading-relaxed">
          {renderInline(line, `p-${i}-${j}`)}
        </p>
      );
    }

    if (code !== undefined) {
      parts.push(
        <pre
          key={`code-${i}`}
          className="my-2 overflow-x-auto rounded-xl border border-line bg-black/50 p-3 text-[0.82rem] font-mono text-cyan-200"
        >
          {lang ? (
            <div className="mb-1 text-[0.7rem] uppercase tracking-wider text-muted">
              {lang}
            </div>
          ) : null}
          <code>{code.replace(/\n$/, "")}</code>
        </pre>
      );
    }
  }

  return <div className="space-y-0.5 text-[0.92rem]"><Fragment>{parts}</Fragment></div>;
}
