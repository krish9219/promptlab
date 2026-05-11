---
id: few-shot
title: Few-shot examples
level: 2
index: 4
estimatedMinutes: 12
assignment:
  task: Write a prompt that converts informal English date phrases to ISO 8601 (YYYY-MM-DD) using at least three few-shot examples. Assume today is 2026-05-12 for relative phrases. Output only the ISO date, no extra text. Use {{input}} for the date phrase.
  testInput: "next Tuesday afternoon"
rubric:
  - criterion: At least 3 few-shot examples
    weight: 3
    description: Prompt must include at least 3 input/output example pairs.
  - criterion: Examples cover diverse cases
    weight: 2
    description: Examples should cover at least 2 different patterns (e.g., relative + named day + month name).
  - criterion: Anchors "today" so relative dates are well-defined
    weight: 2
    description: Prompt establishes a reference date so "next Tuesday" is unambiguous.
  - criterion: Forbids extra commentary in output
    weight: 2
    description: Prompt explicitly says "only the ISO date, no extra text".
  - criterion: Output is exactly an ISO date for the test input
    weight: 3
    description: The actual output for "next Tuesday afternoon" should be 2026-05-19 (next Tuesday after 2026-05-12).
hints:
  - "Establish today's date explicitly so relative phrases like 'next Tuesday' have an anchor."
  - "Use a consistent Input:/Output: structure for every example AND for the final query."
  - "Pick examples that cover different patterns: relative phrase, named month, day-of-week."
  - "End your prompt with 'Output:' and nothing else, so the model continues from there."
---

Few-shot learning is the single highest-leverage prompting technique. On classification, extraction, and format-shaping tasks, adding 2–5 examples typically beats every other technique combined.

## Why it works

LLMs are pattern-completers. Show them a pattern, they continue it:

```
red → #ff0000
green → #00ff00
blue → ?
```

You can guess the model's output. Few-shot prompts work the same way.

## The structure that wins

```
You are <role>. Convert <X> to <Y>.

Examples:
Input: <example 1 input>
Output: <example 1 output>

Input: <example 2 input>
Output: <example 2 output>

Input: <example 3 input>
Output: <example 3 output>

Now do this one:
Input: {{input}}
Output:
```

Notice three things:

1. The label structure (`Input:` / `Output:`) is consistent across examples.
2. The final line is `Output:` with nothing after it — the model continues from where you stopped.
3. Examples come before the real query, not after.

## How many examples?

| Task | Sweet spot |
|---|---|
| Format conversion | 3–5 |
| Classification (5 classes or fewer) | 1 example per class |
| Style imitation | 3–8 (more is better here) |
| Pure extraction | 2–3 |
| Anything where the model is already confident | 0 — examples just cost tokens |

Diminishing returns set in fast past 5. Past 10, you might be better off fine-tuning.

## Choose examples that cover edge cases

The worst few-shot prompts use three near-identical examples. The best ones cover the *shape of the input space*:

For date conversion: one example with a relative phrase ("next Friday"), one with a named month ("March 3"), one with an ambiguous case ("Tuesday" — this Tuesday or next?).

Three carefully chosen examples beat fifteen lazy ones.

## What you'll do

Build a date-to-ISO converter. The test phrase is "next Tuesday afternoon" and today is 2026-05-12 (a Tuesday). The expected output is `2026-05-19`. The grader checks both the structure of your prompt and the correctness of the output.
