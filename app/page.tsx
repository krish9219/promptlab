import Link from "next/link";
import { getMetaList, LEVEL_NAMES, type LessonMeta } from "@/lib/lessons";

export default function Home() {
  const lessons = getMetaList();
  const byLevel = new Map<number, LessonMeta[]>();
  for (const l of lessons) {
    if (!byLevel.has(l.level)) byLevel.set(l.level, []);
    byLevel.get(l.level)!.push(l);
  }
  const total = lessons.reduce((s, l) => s + l.estimatedMinutes, 0);

  return (
    <main className="h-screen overflow-auto px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight">
            prompt<span className="text-accent">lab</span>
          </h1>
          <p className="mt-3 text-lg text-zinc-400">
            Learn prompt engineering by doing. Every lesson ends with an assignment that an LLM grades live.
          </p>
          <p className="mt-2 text-sm text-muted">
            {lessons.length} lessons · ~{total} minutes total
          </p>
        </header>

        {[1, 2, 3, 4].map((lvl) => {
          const items = byLevel.get(lvl) ?? [];
          if (!items.length) return null;
          const color = ["text-beginner", "text-intermediate", "text-advanced", "text-expert"][lvl - 1];
          return (
            <section key={lvl} className="mb-8">
              <h2 className={`mb-3 text-xs uppercase tracking-widest ${color}`}>{LEVEL_NAMES[lvl]}</h2>
              <div className="space-y-2">
                {items.map((l) => (
                  <Link
                    key={l.id}
                    href={`/lesson/${l.id}`}
                    className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3 transition hover:border-accent"
                  >
                    <div>
                      <div className="font-medium">{l.title}</div>
                      <div className="text-xs text-muted">~{l.estimatedMinutes} min</div>
                    </div>
                    <span className="text-muted">&rarr;</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <footer className="mt-12 border-t border-line pt-6 text-sm text-muted">
          <p>
            Set <code className="rounded bg-panel2 px-1.5 py-0.5">OPENAI_API_KEY</code> in
            <code className="ml-1 rounded bg-panel2 px-1.5 py-0.5">.env</code> to run + grade your prompts.
            Source on <a className="text-accent underline" href="https://github.com/krish9219/promptlab">GitHub</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}
