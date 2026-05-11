/**
 * Lesson loader. Lessons live as markdown files in `/lessons/*.md` with
 * frontmatter that describes the assignment + grading rubric.
 *
 * Frontmatter schema:
 *   id: stable identifier (kebab-case)
 *   title: human-readable
 *   level: 1-4 (1=beginner, 2=intermediate, 3=advanced, 4=expert)
 *   index: ordering within and across levels
 *   estimatedMinutes: rough read+practice time
 *   assignment:
 *     task: what the student must accomplish (shown to user)
 *     testInput: the input we'll feed their prompt at grading time
 *     studentSystem: optional system context for the student's prompt run
 *   rubric: array of { criterion: string, weight: number, description: string }
 *
 * After frontmatter, the markdown body is the lesson content (rendered as-is).
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface RubricItem {
  criterion: string;
  weight: number;
  description: string;
}

export interface LessonMeta {
  id: string;
  title: string;
  level: 1 | 2 | 3 | 4;
  index: number;
  estimatedMinutes: number;
  assignment: {
    task: string;
    testInput: string;
    studentSystem?: string;
  };
  rubric: RubricItem[];
  hints: string[];
}

export interface Lesson extends LessonMeta {
  body: string;
}

const LESSONS_DIR = path.join(process.cwd(), "lessons");

let cache: Lesson[] | null = null;

export function getAllLessons(): Lesson[] {
  if (cache) return cache;
  const files = fs.readdirSync(LESSONS_DIR).filter((f) => f.endsWith(".md"));
  const out = files.map((f) => parseLesson(path.join(LESSONS_DIR, f)));
  out.sort((a, b) => a.level - b.level || a.index - b.index);
  cache = out;
  return out;
}

export function getLesson(id: string): Lesson | null {
  return getAllLessons().find((l) => l.id === id) ?? null;
}

export function getMetaList(): LessonMeta[] {
  return getAllLessons().map(({ body: _b, ...meta }) => meta);
}

function parseLesson(filePath: string): Lesson {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  if (!data.id || !data.title || !data.level || !data.assignment || !data.rubric) {
    throw new Error(`Invalid lesson frontmatter in ${filePath}`);
  }
  return {
    id: String(data.id),
    title: String(data.title),
    level: Number(data.level) as 1 | 2 | 3 | 4,
    index: Number(data.index ?? 0),
    estimatedMinutes: Number(data.estimatedMinutes ?? 10),
    assignment: {
      task: String(data.assignment.task),
      testInput: String(data.assignment.testInput),
      studentSystem: data.assignment.studentSystem ? String(data.assignment.studentSystem) : undefined,
    },
    rubric: (data.rubric as RubricItem[]).map((r) => ({
      criterion: String(r.criterion),
      weight: Number(r.weight),
      description: String(r.description),
    })),
    hints: Array.isArray(data.hints) ? data.hints.map(String) : [],
    body: content,
  };
}

export const LEVEL_NAMES: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};
