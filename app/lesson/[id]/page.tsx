import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllLessons, getLesson, LEVEL_NAMES } from "@/lib/lessons";
import { LessonView } from "@/components/LessonView";

export function generateStaticParams() {
  return getAllLessons().map((l) => ({ id: l.id }));
}

export default function LessonPage({ params }: { params: { id: string } }) {
  const lesson = getLesson(params.id);
  if (!lesson) notFound();

  const all = getAllLessons();
  const idx = all.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  const levelColor = ["text-beginner", "text-intermediate", "text-advanced", "text-expert"][lesson.level - 1];

  return (
    <div className="flex h-screen">
      <aside className="hidden w-64 flex-shrink-0 overflow-auto border-r border-line bg-panel md:block">
        <div className="border-b border-line px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            prompt<span className="text-accent">lab</span>
          </Link>
        </div>
        <nav className="space-y-1 p-2">
          {all.map((l) => {
            const lc = ["bg-beginner", "bg-intermediate", "bg-advanced", "bg-expert"][l.level - 1];
            const active = l.id === lesson.id;
            return (
              <Link
                key={l.id}
                href={`/lesson/${l.id}`}
                className={
                  "block rounded-md px-3 py-2 text-sm transition " +
                  (active ? "bg-accent/30 text-white" : "text-zinc-300 hover:bg-line")
                }
              >
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${lc}`} />
                {l.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <Link href="/" className="text-xs text-muted hover:text-white">&larr; all lessons</Link>
          <div className={`mt-3 text-xs uppercase tracking-widest ${levelColor}`}>
            {LEVEL_NAMES[lesson.level]} · ~{lesson.estimatedMinutes} min
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{lesson.title}</h1>
          <LessonView lesson={lesson} />
          <div className="mt-12 flex items-center justify-between border-t border-line pt-6 text-sm">
            {prev ? (
              <Link className="text-accent" href={`/lesson/${prev.id}`}>&larr; {prev.title}</Link>
            ) : <span />}
            {next ? (
              <Link className="text-accent" href={`/lesson/${next.id}`}>{next.title} &rarr;</Link>
            ) : <span />}
          </div>
        </div>
      </main>
    </div>
  );
}
