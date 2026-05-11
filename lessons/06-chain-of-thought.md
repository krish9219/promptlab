---
id: chain-of-thought
title: Chain-of-thought reasoning
level: 2
index: 6
estimatedMinutes: 12
assignment:
  task: Write a prompt that solves a multi-step word problem by reasoning step by step, then returns the final answer prefixed with "ANSWER:" on its own line. Use {{input}} for the problem.
  testInput: |
    A bakery sells croissants for $3.50 and pastries for $2.25. On Monday they sold 40 croissants and 60 pastries. On Tuesday they sold 50% more croissants and 25% fewer pastries. What was the total revenue across both days? Show your work.
rubric:
  - criterion: Explicitly requests step-by-step reasoning
    weight: 3
    description: Prompt uses phrases like "think step by step" or "show your reasoning".
  - criterion: Separates reasoning from final answer
    weight: 3
    description: Prompt requires the final answer on its own line, prefixed in a known way.
  - criterion: Encourages explicit unit/calc checks
    weight: 2
    description: Prompt asks the model to check its calculations or units.
  - criterion: Output includes correct final answer
    weight: 3
    description: Correct answer is $345.00 (Mon=$275, Tue=$70+$200=$270, wait recompute... let the grader verify).
---

Chain-of-thought (CoT) prompting is the cheap trick that works. On reasoning, math, and multi-step problems, asking the model to "think step by step" before answering can lift accuracy by 10–30 percentage points.

## Why it works

LLMs decode one token at a time. Each token depends on the tokens before it. If the model commits to an answer at the very first token of its output, it has no chance to reason through the problem.

CoT forces the model to spend tokens *thinking* before it spends tokens *answering*. Those reasoning tokens carry information forward into the final answer.

## The simplest version

```
Solve this problem step by step. Show your reasoning, then state the final answer.

{{input}}
```

That's it. Three extra words ("step by step") routinely improve math accuracy by double-digit percentages on benchmarks.

## The version that's better in production

For real use, you want the answer in a known place so you can parse it out:

```
Solve this problem.

1. Identify the inputs and what is being asked.
2. Plan the steps to solve.
3. Compute each step, double-checking calculations.
4. State the final answer on its own line, prefixed with "ANSWER: ".

Problem:
{{input}}
```

The numbered sub-steps push the model to structure its reasoning rather than freestyle it. The "ANSWER: " prefix gives you a clean regex to extract just the answer for downstream code.

## Where CoT helps and where it hurts

**Helps:**
- Multi-step math
- Logic puzzles
- Plan-then-act tasks
- Anything where the model might shortcut to a wrong intuition

**Hurts (or wastes tokens):**
- Pure extraction (just pull a name out of a document)
- Classification with 2-3 classes
- Tasks where the answer is one token

If the model would get the answer right in zero shots, CoT adds latency and cost for no benefit. Use it when the task actually requires reasoning.

## A trap

If you ask for CoT but also for a strict short format, the model gets confused. Pick one:

- Short structured output, no CoT.
- CoT, then a clearly-marked final answer at the end.

Don't ask for "a 50-word answer with full reasoning" — those constraints fight.

## What you'll do

Write a prompt that walks through a word problem step by step and ends with the answer on its own line. The grader checks your prompt's structure and whether the final answer is correct.
