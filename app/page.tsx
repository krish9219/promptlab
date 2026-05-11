import Link from "next/link";
import { getMetaList, LEVEL_NAMES, type LessonMeta } from "@/lib/lessons";
import { ProgressChart } from "@/components/ProgressChart";
import { LessonIcon } from "@/components/LessonIcon";
import { Brand } from "@/components/Brand";

export default function Home() {
  const lessons = getMetaList();
  const byLevel = new Map<number, LessonMeta[]>();
  for (const l of lessons) {
    if (!byLevel.has(l.level)) byLevel.set(l.level, []);
    byLevel.get(l.level)!.push(l);
  }
  const totalMin = lessons.reduce((s, l) => s + l.estimatedMinutes, 0);
  const firstLessonId = lessons[0]?.id;

  return (
    <main className="h-screen overflow-auto">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <section className="relative">
          <Brand variant="hero" />
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--panel-2)] px-3 py-1 text-xs text-[color:var(--mute)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--good)] animate-pulse-soft" />
            <span>Live LLM grading · 12 lessons · ~{totalMin} min</span>
          </div>
          <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">
            Learn prompt engineering by <span className="grad-text">getting graded</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[color:var(--text-2)]">
            promptlab teaches prompt engineering the way you actually learn — write a prompt,
            an LLM runs it, a second LLM scores it against a rubric and tells you what to fix.
            Beginner to expert in under three hours.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {firstLessonId && (
              <Link href={`/lesson/${firstLessonId}`} className="btn btn-grad px-5 py-2.5 text-sm">
                Start with lesson 1 &rarr;
              </Link>
            )}
            <a href="https://github.com/krish9219/promptlab" className="btn px-5 py-2.5 text-sm">
              View on GitHub
            </a>
          </div>
        </section>

        <section className="mt-12">
          <ProgressChart lessons={lessons} />
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          <HowItWorks step="1" title="Pick a lesson" body="Each is 8–18 minutes. Read the concept, see the rubric, plan your prompt." />
          <HowItWorks step="2" title="Write your prompt" body="Use the editor. Try it without grading to iterate cheap. Hints unlock progressively." />
          <HowItWorks step="3" title="Get graded live" body="One LLM runs your prompt. Another grades it. 0–100 with per-criterion feedback." />
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Curriculum</h2>
            <span className="text-xs text-[color:var(--mute)]">{lessons.length} lessons · ~{totalMin} min</span>
          </div>
          {[1, 2, 3, 4].map((lvl) => {
            const items = byLevel.get(lvl) ?? [];
            if (!items.length) return null;
            const chip = ["chip-beginner", "chip-intermediate", "chip-advanced", "chip-expert"][lvl - 1];
            return (
              <div key={lvl} className="mb-6">
                <div className={`chip ${chip} mb-3`}>{LEVEL_NAMES[lvl]}</div>
                <div className="space-y-2">
                  {items.map((l) => (
                    <Link
                      key={l.id}
                      href={`/lesson/${l.id}`}
                      className="card flex items-center justify-between gap-4 px-4 py-3 transition hover:translate-x-0.5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--panel-2)] text-[color:var(--accent)]">
                          <LessonIcon id={l.id} />
                        </span>
                        <div>
                          <div className="font-medium leading-tight">{l.title}</div>
                          <div className="mt-0.5 text-xs text-[color:var(--mute)]">~{l.estimatedMinutes} min</div>
                        </div>
                      </div>
                      <span className="text-[color:var(--mute)]">&rarr;</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-6 text-sm text-[color:var(--mute)]">
          <Brand variant="footer" />
          <p className="text-xs">
            Set <code className="rounded bg-[color:var(--panel-2)] px-1.5 py-0.5">OPENAI_API_KEY</code> in <code className="rounded bg-[color:var(--panel-2)] px-1.5 py-0.5">.env</code> to run + grade. Source on <a className="text-[color:var(--accent)] underline" href="https://github.com/krish9219/promptlab">GitHub</a> · MIT
          </p>
        </footer>
      </div>
    </main>
  );
}

function HowItWorks({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-widest text-[color:var(--accent)]">Step {step}</div>
      <div className="mt-1 font-semibold">{title}</div>
      <div className="mt-1 text-sm text-[color:var(--text-2)]">{body}</div>
    </div>
  );
}
