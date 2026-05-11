---
id: output-format
title: Output format and JSON mode
level: 2
index: 5
estimatedMinutes: 12
assignment:
  task: Write a prompt that extracts entities from text and returns ONLY a JSON object with these exact keys, no markdown fences, no extra commentary. Schema -- people (array of strings), organizations (array of strings), dates (array of strings in YYYY-MM-DD where possible). If a category is empty, return an empty array, not null. Use {{input}} for the text.
  testInput: |
    On 2025-03-14, Sundar Pichai of Google announced a partnership with Anthropic. Dario Amodei attended remotely from San Francisco. The deal will run through 2027-12-31.
rubric:
  - criterion: Schema is fully specified
    weight: 3
    description: Prompt explicitly lists the three keys and their types.
  - criterion: Forbids markdown fences and prose
    weight: 2
    description: Prompt explicitly says "no markdown fences" or "JSON only".
  - criterion: Specifies empty-array fallback
    weight: 2
    description: Prompt says empty categories return [] not null.
  - criterion: Shows at least one example
    weight: 2
    description: A small example of input + expected JSON helps.
  - criterion: Output is parseable JSON matching schema
    weight: 3
    description: Output must parse as JSON and have the three required keys, all as arrays.
hints:
  - "Show the exact schema with key names and types right in the prompt."
  - "Forbid markdown fences explicitly. 'No backticks. No prose. JSON only.'"
  - "Include one tiny worked example so the model sees the shape."
  - "Specify the empty-array fallback so the model doesn't return null for missing categories."
---

The single most-requested production capability from LLMs is **structured output**. Most failures here are prompt-side, not model-side.

## Why "respond in JSON" fails ~10% of the time

The model will helpfully wrap its JSON in markdown fences:

```
\`\`\`json
{ "answer": "..." }
\`\`\`
```

Or prefix with chatter: "Here's the JSON you requested:". Or add trailing notes: "Let me know if you need this in a different format!".

Any of these breaks `JSON.parse()`. In production, you need 100%, not 90%.

## The four tactics that get you to 100%

1. **Use JSON mode if your provider supports it.** OpenAI: `response_format: { type: "json_object" }`. Anthropic: tool calling. This forces well-formed JSON at the API level.
2. **Specify the schema in the prompt.** List every key, its type, and whether it's required. Example: `{"name": string, "age": number | null, "tags": string[]}`.
3. **Show an example.** One concrete input/output example beats a paragraph of schema description.
4. **Forbid the common failure modes.** Add: "Respond with ONLY the JSON object. No markdown fences. No prose. No explanation."

## When JSON mode isn't enough

JSON mode guarantees valid JSON syntax. It does **not** guarantee:

- The right *keys* (you can still get `{"result": ...}` when you asked for `{"answer": ...}`)
- The right *types* (numbers might come back as strings)
- That arrays you asked for aren't returned as nulls

Belt and braces: use JSON mode + a clear schema in the prompt + an example + a Zod/Pydantic validator on the parsed result + a retry on validation failure.

## The schema-in-prompt pattern

```
Return JSON of this exact shape:

{
  "people": string[],       // proper names of human beings
  "organizations": string[],// company / institution names
  "dates": string[]         // ISO 8601 (YYYY-MM-DD) when possible
}

If a category has no items, return an empty array, NOT null.
Do not include any text before or after the JSON.
Do not wrap the JSON in markdown fences.

Example:
Input: "Acme was founded by Jane Doe on 2020-01-15."
Output: {"people": ["Jane Doe"], "organizations": ["Acme"], "dates": ["2020-01-15"]}

Input: {{input}}
Output:
```

## What you'll do

Write a prompt that extracts people, organizations, and dates as JSON. The grader runs your prompt against the test input and tries to `JSON.parse()` the result. If it fails, you lose points. If the keys or types don't match, you lose points.
