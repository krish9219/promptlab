/**
 * LLM client. Works with any OpenAI-compatible endpoint — OpenAI itself,
 * OpenRouter, Groq, Together, DeepSeek, Mistral, Ollama, LM Studio, vLLM, etc.
 *
 * Two model roles:
 *   MODEL_STUDENT — the model the student's prompt runs against.
 *   MODEL_JUDGE   — the model that grades the student's output.
 *
 * Configure via env:
 *   OPENAI_API_KEY        required (use any non-empty string for local providers)
 *   OPENAI_BASE_URL       optional. Default https://api.openai.com/v1.
 *                         Examples below in .env.example.
 *   MODEL_STUDENT         default "gpt-4o-mini"
 *   MODEL_JUDGE           default "gpt-4o-mini"
 *   JUDGE_JSON_MODE       "true" | "false". Default "true". Set to false for
 *                         providers that don't implement OpenAI's
 *                         response_format={type:"json_object"} extension.
 */

import OpenAI from "openai";

let _client: OpenAI | null = null;

function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "missing",
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return _client;
}

const USE_JSON_MODE = (process.env.JUDGE_JSON_MODE ?? "true").toLowerCase() !== "false";

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
    "Respond ONLY with a JSON object matching the schema. No markdown fences. No prose.";

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

  const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
    temperature: 0,
  };
  if (USE_JSON_MODE) {
    params.response_format = { type: "json_object" };
  }

  let resp;
  try {
    resp = await client().chat.completions.create(params);
  } catch (e: unknown) {
    // Some OpenAI-compatible providers reject response_format. Retry without.
    const msg = String((e as Error).message || e);
    if (USE_JSON_MODE && /response_format|not supported|invalid|json/i.test(msg)) {
      delete (params as { response_format?: unknown }).response_format;
      resp = await client().chat.completions.create(params);
    } else {
      throw e;
    }
  }

  const text = resp.choices[0].message.content ?? "{}";
  const parsed = safeJsonParse(text);
  const breakdown = (parsed.breakdown ?? []).map(
    (b: { criterion?: string; score?: number; weight?: number; comment?: string }, i: number) => ({
      criterion: b.criterion ?? opts.rubric[i]?.criterion ?? "",
      score: clamp(Number(b.score) || 0, 0, 100),
      weight: Number(b.weight) || opts.rubric[i]?.weight || 1,
      comment: b.comment ?? "",
    }),
  );
  const totalWeight = breakdown.reduce((s: number, b: { weight: number }) => s + b.weight, 0) || 1;
  const total = Math.round(
    breakdown.reduce((s: number, b: { score: number; weight: number }) => s + b.score * b.weight, 0) / totalWeight,
  );
  return { total, breakdown, feedback: parsed.feedback ?? "" };
}

/**
 * Tolerant JSON parser. Many OpenAI-compatible providers return JSON wrapped
 * in markdown fences or with leading commentary. Strip those before parsing.
 */
function safeJsonParse(text: string): { breakdown?: unknown[]; feedback?: string } {
  const trimmed = text.trim();
  // Common case: clean JSON
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try stripping markdown fences
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) {
      try { return JSON.parse(fence[1]); } catch {}
    }
    // Try extracting the first {...} block
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first !== -1 && last > first) {
      try { return JSON.parse(trimmed.slice(first, last + 1)); } catch {}
    }
    console.warn("Judge response was not valid JSON:", trimmed.slice(0, 200));
    return {};
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
