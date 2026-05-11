---
id: anatomy-of-a-prompt
title: Anatomy of a prompt
level: 1
index: 1
estimatedMinutes: 8
assignment:
  task: Write a prompt that summarizes any short article in exactly two sentences. Use {{input}} where the article will be inserted.
  testInput: |
    The James Webb Space Telescope, launched in December 2021, has fundamentally changed how astronomers study the early universe. Its infrared instruments can see through cosmic dust that blocks visible-light telescopes, revealing stars and galaxies forming just 200 million years after the Big Bang. In 2023 it detected the most distant active supermassive black hole yet observed, suggesting these objects formed earlier than theories predicted. The telescope orbits the Sun at the L2 Lagrange point, roughly 1.5 million kilometres from Earth, where it stays cold enough for its sensitive detectors to function.
rubric:
  - criterion: Specifies "exactly two sentences"
    weight: 3
    description: The prompt must explicitly require two sentences (not three, not a paragraph).
  - criterion: Includes {{input}} placeholder or equivalent
    weight: 2
    description: There must be a clear place where the article gets inserted.
  - criterion: No verbose preambles
    weight: 2
    description: The prompt should not waste tokens on "please be helpful" or similar noise.
  - criterion: Output stays focused on summary
    weight: 3
    description: The actual produced summary should be two sentences and capture the main idea.
hints:
  - "Lead with the task in imperative voice. 'Summarize the following...' beats 'You are an expert summarizer who...'"
  - "Use the exact phrase 'exactly two sentences' so the model has nothing to interpret."
  - "Put {{input}} on a new line, clearly separated from the instruction."
---

A prompt has three jobs. It tells the model **what role to take**, **what task to do**, and **what shape the output should have**. Everything else is decoration.

## The minimal prompt

```
Summarize the following article in two sentences.

{{input}}
```

That's it. Five words of instruction, one placeholder for the content. This will work better than 80% of the "act as a world-class expert" preambles people paste from prompt-engineering Twitter.

## Why brevity wins

LLMs follow instructions, but they also follow noise. Every word in your prompt is potentially something the model will try to honour:

- "Please be helpful" → adds hedging language
- "You are the best summarizer in the world" → adds boasting
- "Make sure to be accurate" → adds "I am confident" disclaimers

None of these *hurt* much, but none of them *help*. The signal-to-noise ratio is the prompt-engineering version of "first, do no harm".

## What goes in a prompt

Three slots, in roughly this order:

1. **Role/context** (optional). "You are a senior editor reviewing for clarity."
2. **Task**. The single sentence that says what to do. Imperative voice.
3. **Format**. What the output should look like. Length, structure, tone.

If you put the input *first* and the instruction *after*, the model often misses the instruction. Put instruction first.

## What you'll do

Write a prompt that summarizes any short article into exactly two sentences. Test it against the article in the assignment below. The grader runs your prompt against an LLM and scores it on whether the output is actually two sentences, captures the main idea, and avoids common bloat.

Tip: there's no minimum length on your prompt. Sometimes one line is the right answer.
