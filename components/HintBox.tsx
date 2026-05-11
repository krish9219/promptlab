"use client";

import { useState } from "react";

/**
 * Progressive-disclosure hints. Each click reveals one more hint. Doesn't
 * cost anything (hints live in the lesson frontmatter; no LLM call).
 */
export function HintBox({ hints }: { hints: string[] }) {
  const [revealed, setRevealed] = useState(0);
  if (!hints || hints.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel-2)] p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-widest text-[color:var(--mute)]">
          Stuck? Hints ({revealed}/{hints.length})
        </span>
        <div className="flex gap-2">
          {revealed < hints.length && (
            <button
              className="btn"
              onClick={() => setRevealed((n) => n + 1)}
            >
              Reveal hint {revealed + 1}
            </button>
          )}
          {revealed > 0 && (
            <button className="btn" onClick={() => setRevealed(0)}>
              Hide
            </button>
          )}
        </div>
      </div>
      {revealed > 0 && (
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[color:var(--text-2)]">
          {hints.slice(0, revealed).map((h, i) => (
            <li key={i} className="animate-fade-in">{h}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
