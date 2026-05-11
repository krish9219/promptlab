"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Lesson } from "@/lib/lessons";
import { HintBox } from "./HintBox";
import { ScoreSkeleton } from "./ScoreSkeleton";

interface JudgeBreakdown {
  criterion: string;
  score: number;
  weight: number;
  comment: string;
}
interface JudgeScore {
  total: number;
  breakdown: JudgeBreakdown[];
  feedback: string;
}

const STORAGE_PREFIX = "promptlab:";

function loadDraft(id: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${STORAGE_PREFIX}prompt:${id}`) ?? "";
}
function saveDraft(id: string, prompt: string) {
  localStorage.setItem(`${STORAGE_PREFIX}prompt:${id}`, prompt);
}
function loadBestScore(id: string): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(`${STORAGE_PREFIX}best:${id}`) ?? "0");
}
function saveBestScore(id: string, score: number) {
  const prev = loadBestScore(id);
  if (score > prev) localStorage.setItem(`${STORAGE_PREFIX}best:${id}`, String(score));
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const [prompt, setPrompt] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [running, setRunning] = useState(false);
  const [grading, setGrading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [score, setScore] = useState<JudgeScore | null>(null);
  const [error, setError] = useState<string>("");
  const [best, setBest] = useState(0);
  const [animScore, setAnimScore] = useState(0);

  useEffect(() => {
    setHydrated(true);
    setPrompt(loadDraft(lesson.id));
    setBest(loadBestScore(lesson.id));
  }, [lesson.id]);

  useEffect(() => {
    if (hydrated) saveDraft(lesson.id, prompt);
  }, [prompt, lesson.id, hydrated]);

  useEffect(() => {
    if (!score) return;
    setAnimScore(0);
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const target = score.total;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimScore(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const totalWeight = useMemo(
    () => lesson.rubric.reduce((s, r) => s + r.weight, 0) || 1,
    [lesson.rubric],
  );

  async function tryPrompt() {
    setError("");
    setOutput("");
    setScore(null);
    setRunning(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentPrompt: prompt,
          userInput: lesson.assignment.testInput,
          studentSystem: lesson.assignment.studentSystem,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `http ${res.status}`);
      setOutput(data.output);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function gradePrompt() {
    setError("");
    setOutput("");
    setScore(null);
    setGrading(true);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, studentPrompt: prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `http ${res.status}`);
      setOutput(data.output);
      setScore(data.score);
      saveBestScore(lesson.id, data.score.total);
      setBest((b) => Math.max(b, data.score.total));
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setGrading(false);
    }
  }

  return (
    <div>
      <article className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.body}</ReactMarkdown>
      </article>

      <section className="mt-10 card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Assignment</h2>
          {hydrated && best > 0 && (
            <span className="text-xs text-[color:var(--mute)]">
              Your best: <span className={`font-semibold ${scoreColor(best)}`}>{best}/100</span>
            </span>
          )}
        </div>
        <p className="mt-2 text-[color:var(--text-2)] whitespace-pre-wrap">{lesson.assignment.task}</p>

        <details className="mt-3 text-sm text-[color:var(--mute)]">
          <summary className="cursor-pointer hover:text-white">Test input the grader will feed your prompt</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-2)] p-3 text-xs text-[color:var(--text-2)]">{lesson.assignment.testInput}</pre>
        </details>

        <details className="mt-2 text-sm text-[color:var(--mute)]">
          <summary className="cursor-pointer hover:text-white">Grading rubric ({lesson.rubric.length} criteria)</summary>
          <ul className="mt-2 space-y-1.5 text-xs">
            {lesson.rubric.map((r) => (
              <li key={r.criterion} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-2)] p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-white">{r.criterion}</span>
                  <span className="text-[color:var(--mute)]">weight {r.weight}/{totalWeight}</span>
                </div>
                <div className="mt-1 text-[color:var(--text-2)]">{r.description}</div>
              </li>
            ))}
          </ul>
        </details>

        <HintBox hints={lesson.hints} />

        <label className="mt-5 block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-[color:var(--mute)]">Your prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={'Write your prompt here. Use {{input}} to mark where the test input should go.\nExample: "Summarize the following in 2 sentences:\\n\\n{{input}}"'}
            className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elev)] p-3 text-sm font-mono text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={tryPrompt} disabled={!prompt.trim() || running || grading} className="btn">
            {running ? "Running…" : "Try it (no grade)"}
          </button>
          <button onClick={gradePrompt} disabled={!prompt.trim() || running || grading} className="btn btn-grad">
            {grading ? "Grading…" : "Grade my prompt"}
          </button>
          {error && <span className="text-xs text-[color:var(--danger)]">{error}</span>}
        </div>

        {output && !grading && (
          <div className="mt-5 animate-fade-in">
            <div className="text-xs uppercase tracking-widest text-[color:var(--mute)]">Output</div>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-elev)] p-3 text-sm text-[color:var(--text)]">{output}</pre>
          </div>
        )}

        {grading && <ScoreSkeleton rubricCount={lesson.rubric.length} />}

        {score && !grading && (
          <div className="mt-5 card p-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[color:var(--mute)]">Score</span>
              <span className={`animate-score text-4xl font-extrabold ${scoreColor(score.total)}`}>
                {animScore}<span className="text-base text-[color:var(--mute)]">/100</span>
              </span>
            </div>
            <ScoreBar total={score.total} />
            <div className="mt-3 space-y-2">
              {score.breakdown.map((b) => (
                <div key={b.criterion} className="rounded-lg border border-[color:var(--line)] bg-[color:var(--panel-2)] p-3 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-white">{b.criterion}</span>
                    <span className={`font-mono ${scoreColor(b.score)}`}>
                      {b.score}/100 <span className="text-xs text-[color:var(--mute)]">(weight {b.weight})</span>
                    </span>
                  </div>
                  <div className="mt-1 text-[color:var(--text-2)]">{b.comment}</div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[color:var(--line)]">
                    <div className={`h-1 rounded-full ${barColor(b.score)}`} style={{ width: `${b.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {score.feedback && (
              <p className="mt-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--bg-elev)] p-3 text-sm text-[color:var(--text-2)]">{score.feedback}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ScoreBar({ total }: { total: number }) {
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[color:var(--line)]">
      <div className={`h-2 rounded-full transition-all duration-700 ${barColor(total)}`} style={{ width: `${total}%` }} />
    </div>
  );
}

function scoreColor(n: number): string {
  if (n >= 85) return "text-[color:var(--good)]";
  if (n >= 65) return "text-[color:var(--warn)]";
  return "text-[color:var(--danger)]";
}

function barColor(n: number): string {
  if (n >= 85) return "bg-[color:var(--good)]";
  if (n >= 65) return "bg-[color:var(--warn)]";
  return "bg-[color:var(--danger)]";
}
