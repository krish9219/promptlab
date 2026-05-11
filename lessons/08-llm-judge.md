---
id: llm-as-judge
title: LLM-as-judge for evaluation
level: 3
index: 8
estimatedMinutes: 15
assignment:
  task: |
    Write a prompt that grades a customer-support response on three criteria (tone, accuracy, brevity) on a 1-5 scale each, and returns ONLY valid JSON with the schema:
      scores: {tone, accuracy, brevity}
      comments: {tone, accuracy, brevity}
      overall: number
    The prompt should also include guidance to mitigate length bias (longer answers should not score higher just for being longer). Use {{input}} for the support response being graded.
  testInput: |
    Customer issue: "I was double-charged for my order #44-2871."
    
    Support response to grade: "We are deeply sorry for this regrettable error. Our team works tirelessly to ensure billing accuracy. Rest assured, your concerns are heard and valued. We will look into this promptly."
rubric:
  - criterion: Defines each criterion with a measurable signal
    weight: 3
    description: Each of tone/accuracy/brevity has a description grounded in observable traits.
  - criterion: Specifies a fixed scale
    weight: 2
    description: Prompt uses a fixed 1-5 scale, not vague qualitative grades.
  - criterion: Mitigates length bias
    weight: 3
    description: Prompt explicitly tells the judge not to reward longer answers just for being longer.
  - criterion: Returns valid JSON matching schema
    weight: 2
    description: Output parses as JSON with the right keys and types.
  - criterion: Penalises empty-platitude support replies
    weight: 2
    description: The test response is full of platitudes and resolves nothing. A good judge gives low accuracy.
hints:
  - "Give each criterion concrete observable signals — what would a 1 look like vs a 5?"
  - "Include explicit anti-length-bias instruction: 'Do not reward longer answers just for being longer.'"
  - "Demand strict JSON-only output with no markdown fences."
  - "Weight accuracy higher than tone or brevity — that's what customers actually care about."
---

LLM-as-judge is the cheapest way to scale evaluation. You write a prompt that grades other prompts' outputs, and you can grade thousands of responses per dollar.

It is also famously biased in predictable ways. Knowing the biases is half the skill.

## What LLM judges do well

- **Pairwise comparison** (A vs B) is more reliable than absolute scoring.
- **Tight, single-axis criteria** ("Is this answer relevant? Yes or No") beat broad ones ("Is this a good answer?").
- **Examples of bad and good** in the prompt lift judge accuracy more than fancy rubric language.

## The five biases to design around

1. **Length bias.** Judges reward longer answers even when they say nothing. Always include "Do not reward length; concise correct answers should score higher than verbose ones."
2. **Position bias.** When comparing A and B, judges prefer whichever came first. Mitigate by running each comparison twice with order swapped.
3. **Self-preference.** A model judges its own outputs more favourably than competitors'. Use a different model family for judging than for generating when stakes are high.
4. **Style bias.** Judges prefer outputs that match their own style. Same fix as self-preference.
5. **Confidence bias.** Judges reward confident-sounding answers, even hedging wrong ones. Add "Hedging that is appropriately uncertain is correct, not weak."

## The structure that works

```
You are an evaluator grading <task> responses.

Score each response on these axes, 1-5 each:
- TONE: 1=hostile/robotic, 5=warm and human. Specifically: <2-3 concrete signals>
- ACCURACY: 1=fabricated/wrong, 5=fully correct and cited. Specifically: <signals>
- BREVITY: 1=padded with filler, 5=as short as possible without losing meaning.

Anti-bias rules:
- Do NOT reward length. A 1-sentence accurate answer should score higher than a paragraph of platitudes.
- Hedging is appropriate when the answer is genuinely uncertain. Penalise unjustified confidence.

Output JSON only:
{
  "scores": {"tone": 1-5, "accuracy": 1-5, "brevity": 1-5},
  "comments": {"tone": "one sentence", "accuracy": "one sentence", "brevity": "one sentence"},
  "overall": <weighted average, accuracy weighted 2x>
}

Response to grade:
{{input}}
```

Notice how every axis has **concrete signals**. Without those, the judge falls back on vibes, and you get inconsistent scores across runs.

## When to use a deterministic check instead

LLM judges should grade things humans would have to. For things a regex or a unit test can grade:

- "Did the output produce valid JSON?" → `try { JSON.parse() }`.
- "Did the output mention the customer's order number?" → `output.includes("44-2871")`.
- "Was the output under 200 words?" → `output.split(" ").length < 200`.

Mix deterministic checks with LLM judging. Use the cheapest tool that answers the question.

## What you'll do

Write a judge prompt that grades a customer-support reply on tone, accuracy, and brevity. The test input is a reply that's full of empty platitudes but doesn't address the actual issue (a double charge). A well-designed prompt with anti-bias instructions should give it a low accuracy score.
