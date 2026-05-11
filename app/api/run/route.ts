import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runStudentPrompt } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  studentPrompt: z.string().min(1).max(8000),
  userInput: z.string().max(8000),
  studentSystem: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 500 });
  }
  try {
    const output = await runStudentPrompt(parsed.data);
    return NextResponse.json({ output });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
