---
id: iterative-refinement
title: Iterative refinement chains
level: 4
index: 11
estimatedMinutes: 15
assignment:
  task: Write a TWO-STAGE prompt chain. Stage 1 takes a topic and produces a rough essay outline. Stage 2 takes that outline and refines it (tighter headings, clearer arc, removed weak points). The chain must be expressed as ONE single prompt that runs both stages internally, separated by a clear marker, with the FINAL refined outline at the end. Use {{input}} for the essay topic.
  testInput: "The case against open-plan offices"
rubric:
  - criterion: Two distinct stages clearly separated
    weight: 3
    description: Prompt shows stage 1 (draft) and stage 2 (refine) as separate operations.
  - criterion: Refinement criteria are concrete
    weight: 3
    description: Stage 2 specifies what to improve (e.g., "remove weak points", "tighten headings").
  - criterion: Output structure named in advance
    weight: 2
    description: Prompt specifies that the FINAL output should be the refined outline only, or marked clearly.
  - criterion: Refined outline is genuinely better
    weight: 2
    description: The final outline should be tighter and more specific than the draft would have been.
---

A single prompt can do one thing well. A *chain* of prompts can do hard things well, by letting the model see its own work and improve on it.

Iterative refinement is the simplest, highest-value chain: draft, then critique, then revise.

## Why a chain beats one mega-prompt

If you ask a model to "write a great essay outline in one shot", you get its first instinct. First instincts are okay but rarely tight.

If you ask the model to:

1. Produce a draft outline,
2. Then critique that draft against specific criteria,
3. Then revise based on the critique,

you get something noticeably better — because the model gets to *see its own work* before committing.

## Two ways to do it

**Multi-call chain** (each stage is a separate API call):

```
call 1: outline = generate(topic)
call 2: critique = critique(outline)
call 3: refined = revise(outline, critique)
return refined
```

**Single-call chain** (one prompt walks through all stages):

```
Stage 1: Draft an outline for {{topic}}.
Stage 2: Critique the draft against these criteria: <list>.
Stage 3: Revise the outline applying the critique.

Output ONLY the final refined outline.
```

The multi-call version is more debuggable (you can inspect each stage's output). The single-call version is cheaper and lower-latency.

## What makes the chain valuable: explicit criteria

The critique stage is the load-bearing part. Without explicit criteria, the model writes the same thing twice and pretends it improved.

Good criteria for "improving an outline":

- Each heading is a complete idea, not a placeholder.
- The arc has a clear opening, middle, and end.
- Each section advances the argument; weak sections are merged or cut.
- No heading is vaguer than its parent.
- The total length matches the essay you'd actually write (8-12 headings for a long-form essay).

## The pattern that wins

```
Topic: {{input}}

STAGE 1 — Draft outline:
Produce a rough essay outline (8-12 headings). Don't polish; just get the shape down.

STAGE 2 — Critique:
Score the draft against:
  - Heading specificity (are any headings vague?)
  - Argument arc (does each section advance the thesis?)
  - Redundancy (are any two sections the same point?)
List concrete weaknesses with brief justification.

STAGE 3 — Refine:
Apply the critique. Rewrite the outline.

OUTPUT FORMAT:
Return ONLY the final refined outline, starting with "# Refined outline:".
Do not include the draft or the critique in the output.
```

The last line is what makes this a usable production prompt: downstream code gets a clean output, not a transcript.

## Limits

If the model doesn't have enough capability for the task, refinement won't save you. Refinement makes a *good* model produce *very good* output. It does not make a weak model strong.

## What you'll do

Write a single prompt that internally does draft → critique → refine on an essay outline. The grader checks that your prompt has explicit stages with concrete criteria and that the final output is just the refined outline.
