---
id: production-prompts
title: Production prompts (caching, eval, A/B)
level: 4
index: 12
estimatedMinutes: 18
assignment:
  task: |
    Write a production-grade prompt that extracts structured invoice data (vendor, total, due_date, line_items) from messy email text. The prompt must include (1) a system message defining the role and the JSON schema, (2) at least one few-shot example, (3) a fallback behavior for missing fields, (4) a version comment, and (5) an explicit "low confidence" path where the model signals uncertainty rather than guessing. Use {{input}} for the email text.
  testInput: |
    Subject: Your March invoice

    Hi team,

    Quick note -- the March bill from Acme Cloud Services came in. It's $4,250 for our usage, plus $300 in support credits we used. Net due is $3,950, by April 15.

    Cheers,
    Sam
rubric:
  - criterion: Has a system message + role
    weight: 2
    description: Prompt clearly defines the role and task in a system-message-shaped section.
  - criterion: JSON schema fully specified
    weight: 3
    description: All four fields (vendor, total, due_date, line_items) are listed with types.
  - criterion: At least one few-shot example
    weight: 2
    description: Concrete input/output example is included.
  - criterion: Fallback for missing fields
    weight: 2
    description: Prompt specifies what to do when a field is missing (null, empty string, etc).
  - criterion: Low-confidence path
    weight: 3
    description: Prompt provides an explicit way to signal uncertainty (a confidence field or an underscored flag indicating low confidence).
  - criterion: Version comment for ops
    weight: 2
    description: Prompt includes a version number/tag for production rollouts.
  - criterion: Output is parseable + correct
    weight: 3
    description: Output should parse as JSON with vendor=Acme Cloud Services, total=3950, due_date=2026-04-15 (or 2024/2025 depending on context), line_items including the credit.
---

The prompt that works in your prototype is rarely the prompt that survives production. Production prompts have nine concerns the prototype doesn't.

## The nine concerns

1. **Schema correctness.** The downstream code wants `{vendor, total, due_date, line_items}` with specific types. Drift kills pipelines.
2. **Fallbacks for missing data.** The email doesn't mention a vendor? Return `null`, not `"unknown"`. The downstream code will branch differently.
3. **Confidence signalling.** A confidently-wrong extraction is worse than a refused one. Give the model an out: `_confidence: "low"`.
4. **Versioning.** A new prompt is a new behaviour. Tag it (`# prompt v3.2`) so when A/B results come in, you know what they reference.
5. **Cost.** Long prompts cost money on every call. Use prompt caching (Anthropic / OpenAI) for stable system messages.
6. **Latency.** Models take longer to read 4000 tokens than 400. Stream output. Trim the prompt.
7. **Eval coverage.** Every prompt should have a held-out set of test cases. When you change the prompt, you run them.
8. **Observability.** Log the input, the output, the latency, the cost, the model version. You will need them.
9. **Failure handling.** What happens when the API is down? When JSON parsing fails? When the model returns an unexpected key?

A production prompt addresses all nine, even briefly.

## A production-ready template

```
# Invoice extraction — prompt v3.2
# Owner: aravind@example.com  |  Last review: 2026-05-10
# Eval set: data/invoice-eval-v2.jsonl (47 cases, last accuracy: 94%)

SYSTEM: You extract structured invoice data from email text.

Output exactly this JSON schema:
{
  "vendor": string | null,
  "total": number | null,       // net amount due in USD, after credits
  "currency": string,           // ISO 4217, e.g. "USD". Default "USD" if implied.
  "due_date": string | null,    // ISO 8601 (YYYY-MM-DD)
  "line_items": [{"description": string, "amount": number}],
  "_confidence": "high" | "medium" | "low",
  "_notes": string | null       // anything the consumer needs to know
}

Rules:
- If a field is genuinely absent, return null. Do NOT invent.
- If text is ambiguous, return "_confidence": "low" and put your concern in "_notes".
- "total" is always the NET amount (after discounts/credits), not gross.

Example input:
"Stripe invoice #INV-998 for $1,200 due Jan 30, 2026."
Example output:
{"vendor":"Stripe","total":1200,"currency":"USD","due_date":"2026-01-30","line_items":[{"description":"invoice INV-998","amount":1200}],"_confidence":"high","_notes":null}

Now extract from:
{{input}}
```

## What this gives you

- **Caching**: the entire SYSTEM + schema + example is stable. Cache it. New emails only pay for the tail.
- **A/B testing**: increment the version. Run both for 24 hours. Compare on the eval set + on live traffic logs.
- **Debugging**: when a customer complains about a wrong extraction, you have the prompt version in your log. You can reproduce.
- **Confidence routing**: pipe `_confidence: "low"` invoices to a human queue automatically.

## The hardest part: eval discipline

Build an eval set of 50+ cases the first week you ship. Every prompt change runs against it. If accuracy goes down, you don't ship.

The eval set itself is a moat. The prompt is replaceable; the eval set is your accumulated knowledge of what production looks like.

## What you'll do

Write an invoice-extraction prompt that hits all the production criteria above. The grader checks structure (schema, example, fallback, confidence, version) AND correctness on the test invoice.
