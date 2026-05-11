"use client";

import Link from "next/link";
import { useState } from "react";
import { LessonIcon } from "./LessonIcon";
import { Brand } from "./Brand";

interface Item {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4;
}

const LEVEL_DOT = ["bg-[color:var(--good)]", "bg-cyan-400", "bg-purple-400", "bg-[color:var(--danger)]"];

export function Sidebar({ items, activeId }: { items: Item[]; activeId: string }) {
  const [open, setOpen] = useState(false);

  const Tree = (
    <nav className="space-y-1 p-2" onClick={() => setOpen(false)}>
      {items.map((l) => {
        const active = l.id === activeId;
        return (
          <Link
            key={l.id}
            href={`/lesson/${l.id}`}
            className={
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition " +
              (active
                ? "bg-[color:var(--accent)]/15 text-white"
                : "text-[color:var(--text-2)] hover:bg-[color:var(--panel-2)]")
            }
          >
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${LEVEL_DOT[l.level - 1]}`} />
            <span className="text-[color:var(--accent)]"><LessonIcon id={l.id} /></span>
            <span className="truncate">{l.title}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed left-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-md border border-[color:var(--line)] bg-[color:var(--panel)] text-sm md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open lesson list"
      >
        ☰
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-72 max-w-[80%] overflow-auto border-r border-[color:var(--line)] bg-[color:var(--panel)]">
            <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-4">
              <Brand />
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-[color:var(--mute)]">✕</button>
            </div>
            {Tree}
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 overflow-auto border-r border-[color:var(--line)] bg-[color:var(--panel)] md:block">
        <div className="border-b border-[color:var(--line)] px-4 py-4">
          <Brand />
        </div>
        {Tree}
      </aside>
    </>
  );
}
