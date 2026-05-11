"use client";

/**
 * SVG sparkline of best score per lesson. No chart library — pure SVG
 * keeps the bundle small and the rendering predictable.
 */

import { useEffect, useState } from "react";

interface Lesson {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4;
  index: number;
}

const LEVEL_COLOR = ["#34d399", "#22d3ee", "#a855f7", "#ef4444"];

export function ProgressChart({ lessons }: { lessons: Lesson[] }) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const out: Record<string, number> = {};
    for (const l of lessons) {
      const v = Number(localStorage.getItem(`promptlab:best:${l.id}`) ?? "0");
      if (v > 0) out[l.id] = v;
    }
    setScores(out);
    setHydrated(true);
  }, [lessons]);

  if (!hydrated) {
    return <div className="h-24 skeleton rounded-xl" aria-hidden />;
  }

  const completed = Object.keys(scores).length;
  const avg =
    completed === 0
      ? 0
      : Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / completed);

  const W = 720;
  const H = 96;
  const PAD_X = 16;
  const PAD_Y = 14;
  const inner = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const step = lessons.length > 1 ? inner / (lessons.length - 1) : inner;

  const points = lessons.map((l, i) => {
    const x = PAD_X + step * i;
    const v = scores[l.id] ?? 0;
    const y = PAD_Y + innerH - (v / 100) * innerH;
    return { x, y, value: v, level: l.level, title: l.title };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${(H - PAD_Y).toFixed(1)} L ${points[0].x.toFixed(1)} ${(H - PAD_Y).toFixed(1)} Z`;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-[color:var(--mute)]">Your progress</div>
          <div className="mt-1 text-sm text-[color:var(--text-2)]">
            <span className="text-[color:var(--text)] font-semibold">{completed}</span> of {lessons.length} lessons attempted
            {completed > 0 && (
              <> · average best score <span className="text-[color:var(--text)] font-semibold">{avg}/100</span></>
            )}
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" role="img" aria-label="Progress sparkline">
        <defs>
          <linearGradient id="pl-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pl-line" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <line x1={PAD_X} x2={W - PAD_X} y1={PAD_Y + innerH * 0.15} y2={PAD_Y + innerH * 0.15} stroke="#262626" strokeDasharray="2 4" />
        <line x1={PAD_X} x2={W - PAD_X} y1={PAD_Y + innerH * 0.5} y2={PAD_Y + innerH * 0.5} stroke="#262626" strokeDasharray="2 4" />
        <path d={areaPath} fill="url(#pl-area)" />
        <path d={path} stroke="url(#pl-line)" strokeWidth="2" fill="none" />
        {points.map((p) => (
          <g key={p.title}>
            <circle cx={p.x} cy={p.y} r={p.value > 0 ? 4 : 2.5} fill={LEVEL_COLOR[p.level - 1]} stroke="#0a0a0a" strokeWidth="1.5">
              <title>{p.title}: {p.value > 0 ? `${p.value}/100` : "not attempted"}</title>
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}
