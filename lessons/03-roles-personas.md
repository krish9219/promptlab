---
id: roles-and-personas
title: Roles, personas, and what doesn't help
level: 1
index: 3
estimatedMinutes: 10
assignment:
  task: Write a prompt that critiques a short code snippet as a senior staff engineer reviewing it for a code review. The critique should identify the most important issue (correctness, security, or design) and propose a concrete fix in 3-5 sentences. Use {{input}} for the code.
  testInput: |
    def get_user(id):
        return db.execute(f"SELECT * FROM users WHERE id = {id}").fetchone()
rubric:
  - criterion: Sets a concrete role, not vague boast
    weight: 2
    description: Prompt specifies "senior staff engineer" or equivalent specific role — not "world-class expert".
  - criterion: Constrains output to one main issue
    weight: 2
    description: Prompt tells the model to focus on the single most important issue, not a laundry list.
  - criterion: Requires a concrete fix
    weight: 2
    description: Prompt asks for an actionable fix, not just a description of the problem.
  - criterion: Length constraint
    weight: 2
    description: Prompt enforces 3-5 sentences or similar concrete length.
  - criterion: Output actually catches the SQL injection
    weight: 3
    description: The test input has a clear SQL injection vulnerability. Good critiques catch it.
---

Roles work. They just don't work the way prompt-Twitter says they do.

## What a role actually changes

Telling the model "you are a senior staff engineer" shifts:

- **Vocabulary** — "ergonomics", "load-bearing", "blast radius" instead of "easy", "important", "scope".
- **Concerns** — production failure modes instead of cosmetic improvements.
- **Tone** — calmer, more decisive. Less hedging.

It does **not** make the model more accurate, more honest, or smarter than its base capability. The model is still the same model.

## What doesn't help

These do almost nothing:

- "You are the best X in the world."
- "You are a Nobel Prize winner in X."
- "You have 30 years of experience in X."
- "Pretend you are X but better."

Frontier models have read the same dataset you have. They know "Nobel Prize winner" means high-quality. They already produce their best output when asked clearly. Boasting roles add noise.

## What does help

- A **concrete role** that implies specific vocabulary and concerns.
- A **specific audience** ("explain to a backend dev who hasn't used Postgres").
- A **specific format** the role would actually use ("a code review comment, two paragraphs").

Compare:

| Bad | Good |
|---|---|
| "You are the world's best code reviewer." | "You are a senior staff engineer doing a final review before merge." |
| "Act like a doctor." | "You are a triage nurse explaining options to an anxious patient." |
| "You are a literary genius." | "You are an editor at The New Yorker checking for clarity." |

The good versions imply a *job*. The job is what shapes the output.

## When to skip the role entirely

For pure extraction tasks ("pull all email addresses from this text") a role adds nothing. Skip it. The smallest prompt that works is always the best prompt.

## What you'll do

Write a prompt that gets the model to do a senior-level code review on the snippet in the assignment. The grader checks that you set a concrete role (not a boast), that you constrain the output to one main issue with a fix, and that the actual output catches the **SQL injection** in the test snippet.
