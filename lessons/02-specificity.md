---
id: specificity-beats-verbosity
title: Specificity beats verbosity
level: 1
index: 2
estimatedMinutes: 10
assignment:
  task: Write a prompt that turns vague written feedback into exactly three specific, actionable items, each starting with a verb. Output as a numbered list.
  testInput: |
    "Honestly, the deck was fine, but the energy in the room felt off. The intro went on too long and I think people were checking out by slide 4. Could use more concrete numbers maybe?"
  studentSystem: You are an executive coach helping a junior employee turn fuzzy feedback into a concrete plan.
rubric:
  - criterion: Requires verb-led action items
    weight: 2
    description: Prompt explicitly says each item must start with an action verb (e.g., "Cut", "Add", "Move").
  - criterion: Requires concrete and specific items
    weight: 3
    description: Prompt forbids hedging or vague items like "be better" or "improve flow".
  - criterion: Exact count of 3
    weight: 2
    description: Prompt specifies exactly three items.
  - criterion: Output is a clean numbered list
    weight: 2
    description: Output format matches a numbered list with no surrounding chatter.
  - criterion: Output items are actually specific
    weight: 3
    description: The actual produced items should be concrete enough to act on this week.
hints:
  - "Add a sentence that bans vague verbs like 'consider', 'improve', 'enhance'. Require concrete action verbs."
  - "Specify the exact count ('exactly 3 items') and the exact format ('numbered list, no preamble')."
  - "Constrain action specificity: 'Each item must be something the speaker could do this week.'"
---

The single biggest mistake new prompters make is being *too polite*. Real instructions, the kind a senior engineer gives a junior, are direct and constraining.

## Vague vs specific

| Vague | Specific |
|---|---|
| "Summarize this" | "Summarize in 50 words, focus on outcomes, no adjectives" |
| "Make it better" | "Cut filler. Replace passive voice. Aim for 200 words" |
| "Be professional" | "Use Apple-press-release tone. No exclamation marks. Max 3 sentences" |

The right column constrains. The model has fewer ways to interpret it, so the output is more predictable.

## Constraints the model actually follows

Frontier models reliably honour:

- **Token / sentence / word counts** ("exactly two sentences", "under 50 words")
- **Output format** ("numbered list", "JSON with these keys", "markdown table")
- **Tone tags** ("technical, dry", "warm but not casual")
- **Negative instructions when paired with positives** ("do not use exclamation marks. Use periods.")

They less reliably follow:

- Vague style adjectives ("make it punchier") — pair with concrete examples
- "Don't be wrong" / "be accurate" — these don't reduce hallucinations
- "Pretend you are a Nobel Prize winner" — has almost no effect on quality

## The verb test

Good action items pass the **verb test**: read the item aloud and ask "could I do this *today*?"

- "Improve clarity" → fails. *How?*
- "Cut the intro to one slide" → passes.

When you build prompts that produce action items, **make the verb test part of the prompt itself**. Tell the model the items must start with action verbs, ban hedging words like "consider" or "maybe", and demand a specific count.

## What you'll do

Take the squishy feedback in the test input and produce three crisp, verb-led action items. The grader checks both the structure of your prompt and whether the actual output passes the verb test.
