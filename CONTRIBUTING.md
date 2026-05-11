# Contributing

Thanks for considering a contribution.

## Setup

```bash
git clone https://github.com/krish9219/promptlab
cd promptlab
cp .env.example .env       # add OPENAI_API_KEY
npm install
npm run dev                 # http://localhost:3004
```

## High-value contributions

- **New lessons.** Drop a new `lessons/NN-topic.md` file with valid frontmatter (see existing lessons for the shape). The lesson appears in the sidebar automatically.
- **Better rubrics** on existing lessons — more concrete criteria, better weights.
- **Better hints** — progressive disclosures that actually help, not just rephrase the task.
- **Anthropic provider** in `lib/openai.ts` (right now it's OpenAI only).
- **Better UI / animations / accessibility.**

## Likely to be rejected

- User accounts / login. Out of scope for v1 — localStorage is intentional.
- Heavy chart libraries (recharts, chart.js). The progress chart is hand-rolled SVG on purpose; keep the bundle small.
- Lessons that don't have a clear, gradeable assignment. Reading-only sections belong in blog posts.

## Lesson file format

```markdown
---
id: kebab-case-id              # stable identifier, used in URLs
title: Human-readable title
level: 1                       # 1=beginner, 2=intermediate, 3=advanced, 4=expert
index: 13                      # ordering within the curriculum
estimatedMinutes: 10
assignment:
  task: |
    What the student must do. Multi-line OK.
    Use {{input}} to mark where the test input gets substituted.
  testInput: |
    The actual input that gets fed to the student's prompt at grading time.
  studentSystem: |             # optional — extra system message for the student LLM
    Any extra context the student LLM needs to evaluate the prompt fairly.
rubric:
  - criterion: First thing to check
    weight: 3                  # higher = more important
    description: How to score it. Be specific.
hints:
  - "Each hint is a short imperative."
  - "Hints should add value progressively, not repeat each other."
---

# Lesson body in markdown
```

## PR checklist

- [ ] `npm run build` produces no type errors.
- [ ] New lessons have valid frontmatter (run `npm run dev` and verify the lesson appears).
- [ ] If you changed `lib/openai.ts`, manually test grading on at least one lesson.
- [ ] No new heavy dependencies without justification.
