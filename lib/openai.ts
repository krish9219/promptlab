/**
 * Thin OpenAI wrapper. Two model roles:
 *
 *   MODEL_STUDENT: the model the student's prompt runs against.
 *   MODEL_JUDGE: the model that grades the student's output against the rubric.
 *
 * Keeping these distinct (even if pointing to the same model name) makes it
 * trivial to upgrade either independently.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export async function runStudentPrompt(opts: {
  studentSystem?: string;
  studentPrompt: string;
  userInput: string;
}): Promise<string> {
  const model = process.env.MODEL_STUDENT || "gpt-4o-mini";
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (opts.studentSystem) messages.push({ role: "system", content: opts.studentSystem });
  // The student's prompt becomes the user-side template. We substitute {{input}}
  // with the test input. If the student didn't include {{input}}, we append it.
  let prompt = opts.studentPrompt;
  if (prompt.includes("{{input}}")) {
    prompt = prompt.replaceAll("{{input}}", opts.userInput);
  } else {
    prompt = `${prompt}\n\nInput: ${opts.userInput}`;
  }
  messages.push({ role: "user", content: prompt });

  const resp = await client().chat.completions.create({
    model,
    messages,
    temperature: 0.2,
  });
  return resp.choices[0].message.content ?? "";
}

export interface JudgeRubricItem {
  criterion: string;
  weight: number;
  description: string;
}

export interface JudgeScore {
  total: number;
  breakdown: { criterion: string; score: number; weight: number; comment: string }[];
  feedback: string;
}

export async function judge(opts: {
  task: string;
  testInput: string;
  studentPrompt: string;
  studentOutput: string;
  rubric: JudgeRubricItem[];
}): Promise<JudgeScore> {
  const model = process.env.MODEL_JUDGE || "gpt-4o-mini";

  const rubricText = opts.rubric
    .map((r) => `- **${r.criterion}** (weight ${r.weight}): ${r.description}`)
    .join("\n");

  const system =
    "You are a strict, fair prompt-engineering instructor. " +
    "Grade the student's prompt against the rubric. Be specific, concise, and actionable. " +
    "Penalize hand-waving, missing instructions, or output that doesn't match the rubric. " +
    "Reward specificity, structure, and prompts that would generalize beyond the test input. " +
    "Respond ONLY with a JSON object matching the schema.";

  const userMsg = `
**Assignment task:**
${opts.task}

**Test input fed to the student's prompt:**
${opts.testInput}

**Student's submitted prompt:**
${opts.studentPrompt}

**Output produced by an LLM given that prompt + the test input:**
${opts.studentOutput}

**Rubric:**
${rubricText}

Score each rubric criterion from 0 to 100. Compute the weighted average as "total".

Respond as JSON of shape:
{
  "breakdown": [{"criterion": "...", "score": 0-100, "weight": <number>, "comment": "<one sentence>"}],
  "feedback": "<2-4 sentences of actionable feedback>"
}
`;

  const resp = await client().chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const text = resp.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(text) as {
    breakdown?: { criterion: string; score: number; weight: number; comment: string }[];
    feedback?: string;
  };
  const breakdown = (parsed.breakdown ?? []).map((b, i) => ({
    criterion: b.criterion ?? opts.rubric[i]?.criterion ?? "",
    score: clamp(Number(b.score) || 0, 0, 100),
    weight: Number(b.weight) || opts.rubric[i]?.weight || 1,
    comment: b.comment ?? "",
  }));
  const totalWeight = breakdown.reduce((s, b) => s + b.weight, 0) || 1;
  const total = Math.round(breakdown.reduce((s, b) => s + b.score * b.weight, 0) / totalWeight);
  return { total, breakdown, feedback: parsed.feedback ?? "" };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
