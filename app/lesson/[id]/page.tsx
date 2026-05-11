import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllLessons, getLesson, LEVEL_NAMES } from "@/lib/lessons";
import { LessonView } from "@/components/LessonView";
import { Sidebar } from "@/components/Sidebar";

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

  const chipClass = ["chip-beginner", "chip-intermediate", "chip-advanced", "chip-expert"][lesson.level - 1];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar items={all.map((l) => ({ id: l.id, title: l.title, level: l.level }))} activeId={lesson.id} />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-5 py-8 pt-14 sm:px-10 md:pt-8">
          <Link href="/" className="text-xs text-[color:var(--mute)] hover:text-white">&larr; all lessons</Link>
          <div className="mt-3 flex items-center gap-2">
            <span className={`chip ${chipClass}`}>{LEVEL_NAMES[lesson.level]}</span>
            <span className="text-xs text-[color:var(--mute)]">~{lesson.estimatedMinutes} min</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
          <LessonView lesson={lesson} />

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-6 text-sm">
            {prev ? (
              <Link className="btn" href={`/lesson/${prev.id}`}>&larr; {prev.title}</Link>
            ) : <span />}
            {next ? (
              <Link className="btn btn-primary" href={`/lesson/${next.id}`}>{next.title} &rarr;</Link>
            ) : <span />}
          </div>
        </div>
      </main>
    </div>
  );
}
