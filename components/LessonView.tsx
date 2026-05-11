"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Lesson } from "@/lib/lessons";

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

  useEffect(() => {
    setHydrated(true);
    setPrompt(loadDraft(lesson.id));
    setBest(loadBestScore(lesson.id));
  }, [lesson.id]);

  useEffect(() => {
    if (hydrated) saveDraft(lesson.id, prompt);
  }, [prompt, lesson.id, hydrated]);

  const totalWeight = useMemo(
    () => lesson.rubric.reduce((s, r) => s + r.weight, 0) || 1,
    [lesson.rubric],
  );

  async function tryPrompt() {
    setError("");
    setOutput("");
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

      <section className="mt-10 rounded-xl border border-line bg-panel p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Assignment</h2>
          {hydrated && best > 0 && (
            <span className="text-xs text-muted">Your best: <span className={`font-semibold ${scoreColor(best)}`}>{best}/100</span></span>
          )}
        </div>
        <p className="mt-2 text-zinc-300">{lesson.assignment.task}</p>

        <details className="mt-3 text-sm text-muted">
          <summary className="cursor-pointer hover:text-white">Test input the grader will feed your prompt</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-panel2 p-3 text-xs text-zinc-300 border border-line">{lesson.assignment.testInput}</pre>
        </details>

        <details className="mt-2 text-sm text-muted">
          <summary className="cursor-pointer hover:text-white">Grading rubric</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {lesson.rubric.map((r) => (
              <li key={r.criterion} className="rounded border border-line bg-panel2 p-2">
                <span className="font-semibold text-white">{r.criterion}</span>
                <span className="ml-2 text-muted">weight {r.weight}/{totalWeight}</span>
                <div className="mt-0.5 text-zinc-400">{r.description}</div>
              </li>
            ))}
          </ul>
        </details>

        <label className="mt-5 block">
          <span className="mb-2 block text-xs uppercase tracking-widest text-muted">Your prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={'Write your prompt here. Use {{input}} to mark where the test input should go.\nExample: "Summarize the following text in 2 sentences:\\n\\n{{input}}"'}
            className="w-full rounded-lg border border-line bg-ink p-3 text-sm font-mono text-zinc-200 outline-none focus:border-accent"
          />
        </label>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={tryPrompt}
            disabled={!prompt.trim() || running || grading}
            className="rounded-md border border-line bg-panel2 px-4 py-2 text-sm hover:border-accent disabled:opacity-40"
          >
            {running ? "Running…" : "Try it (no grade)"}
          </button>
          <button
            onClick={gradePrompt}
            disabled={!prompt.trim() || running || grading}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {grading ? "Grading…" : "Grade my prompt"}
          </button>
          {error && <span className="text-xs text-danger">{error}</span>}
        </div>

        {output && (
          <div className="mt-5">
            <div className="text-xs uppercase tracking-widest text-muted">Output</div>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-ink p-3 text-sm text-zinc-200">{output}</pre>
          </div>
        )}

        {score && (
          <div className="mt-5 rounded-xl border border-line bg-panel2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted">Score</span>
              <span className={`text-3xl font-extrabold ${scoreColor(score.total)}`}>{score.total}<span className="text-base text-muted">/100</span></span>
            </div>
            <div className="mt-3 space-y-2">
              {score.breakdown.map((b) => (
                <div key={b.criterion} className="rounded-lg border border-line bg-panel p-3 text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold text-white">{b.criterion}</span>
                    <span className={`font-mono ${scoreColor(b.score)}`}>{b.score}/100 <span className="text-xs text-muted">(weight {b.weight})</span></span>
                  </div>
                  <div className="mt-1 text-zinc-300">{b.comment}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-zinc-300">{score.feedback}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function scoreColor(n: number): string {
  if (n >= 85) return "text-good";
  if (n >= 65) return "text-warn";
  return "text-danger";
}
