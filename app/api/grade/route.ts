import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLesson } from "@/lib/lessons";
import { judge, runStudentPrompt } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  lessonId: z.string().min(1),
  studentPrompt: z.string().min(1).max(8000),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }
  const lesson = getLesson(parsed.data.lessonId);
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  try {
    const output = await runStudentPrompt({
      studentSystem: lesson.assignment.studentSystem,
      studentPrompt: parsed.data.studentPrompt,
      userInput: lesson.assignment.testInput,
    });
    const score = await judge({
      task: lesson.assignment.task,
      testInput: lesson.assignment.testInput,
      studentPrompt: parsed.data.studentPrompt,
      studentOutput: output,
      rubric: lesson.rubric,
    });
    return NextResponse.json({ output, score });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
