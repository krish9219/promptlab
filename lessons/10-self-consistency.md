---
id: self-consistency
title: Self-consistency and ensembles
level: 4
index: 10
estimatedMinutes: 15
assignment:
  task: Write a prompt that solves an ambiguous reasoning task by reasoning multiple times with different angles, then chooses the answer that recurs most. Output the final answer plus a brief note on the alternatives considered. Use {{input}} for the question.
  testInput: |
    Three friends each contributed differently to a project. Alex did 40% of the writing, Bo did 35% of the design, and Cory did 50% of the coding. The writing was 30% of the project, design 20%, and coding 50%. Who contributed the most overall, and by what percentage of the total project?
rubric:
  - criterion: Instructs multiple reasoning attempts
    weight: 3
    description: Prompt explicitly asks for 3+ separate reasoning passes from different angles.
  - criterion: Specifies an aggregation method
    weight: 3
    description: Prompt says how to choose among the attempts (majority, most rigorous, etc.).
  - criterion: Asks for alternatives in the output
    weight: 2
    description: Prompt requires noting alternative answers considered.
  - criterion: Correct final answer
    weight: 2
    description: Correct answer is Cory at 25% (50% of coding which is 50% of project = 0.5*0.5 = 25%).
hints:
  - "Explicitly ask for 3+ separate reasoning attempts, each from a different angle."
  - "Tell the model how to aggregate: 'majority answer wins' or 'pick the most rigorous chain'."
  - "Demand the alternatives be shown so you can audit the reasoning."
  - "Sample the work: each attempt should multiply contribution-share by category-weight."
---

Self-consistency is the technique that turns "the model got it right 60% of the time" into "the model gets it right 80% of the time" at the cost of N× tokens.

The idea: ask the model to solve the problem multiple times, then take the answer that recurs most often.

## Why it works

LLM reasoning is non-deterministic at temperature > 0. Different reasoning paths can produce different answers. If the *correct* reasoning path is the most likely one, then sampling many paths and voting concentrates probability mass on the correct answer.

This works best when:

- The problem has a single, well-defined answer.
- The model is mostly-correct (≥50% per attempt) but occasionally wrong.
- The wrong answers are different from each other (not all the same wrong answer).

## Two flavours

**Sampling self-consistency**: call the model N times at temperature 0.7, take the most-common answer. This requires N API calls.

**Single-call self-consistency**: prompt the model to reason from multiple angles within one response, then pick its best answer. Costs more tokens per call but is one call. Useful when the model has a 100k context.

The single-call version is what you'll write in this lesson.

## The single-call structure

```
Solve this problem three separate times, each from a different angle:

Attempt 1: Work forward from the inputs.
Attempt 2: Work backward from a guess at the answer.
Attempt 3: Set up the problem as equations / formulas.

After all three, compare the answers. If they agree, that's your answer. If
they disagree, identify which reasoning is most rigorous and use that.

Output:
ATTEMPTS: <brief summary of each>
CHOSEN ANSWER: <final answer with one-sentence justification>
ALTERNATIVES CONSIDERED: <other answers that came up and why you rejected them>

Problem: {{input}}
```

## When NOT to use it

- **Extraction tasks**: there's only one right answer; sampling doesn't help.
- **Creative tasks**: variation is a *feature*, not noise to average away.
- **Latency-sensitive paths**: every extra call adds latency.
- **Cost-sensitive paths**: 3× tokens per answer adds up.

Use self-consistency on the long tail of hard reasoning queries that your normal prompt gets wrong. Don't blanket-apply it.

## A sharper variant: ensemble across prompts

Even more powerful: ask the same question with three *differently-worded* prompts and aggregate. This catches biases in any single prompt phrasing. It's more work to maintain (three prompts to debug) but produces the most robust answers.

## What you'll do

Write a prompt that solves a percentage-contribution problem with three reasoning attempts and picks the best. The grader checks that you actually instructed multiple attempts, specified how to aggregate, and that the final answer is correct (Cory contributed 25% of the total project — the largest single share).
