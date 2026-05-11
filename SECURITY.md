# Security policy

## Supported versions

Only the `main` branch is supported.

## Reporting

Email the maintainer via the GitHub profile, or use GitHub's private vulnerability reporting.

## What this app sends to third parties

promptlab makes two kinds of OpenAI API calls per graded assignment:

1. **Student call** — the student's prompt + the lesson's fixed test input are sent to the model configured in `MODEL_STUDENT`.
2. **Judge call** — the student's prompt + the model output + the rubric are sent to the model configured in `MODEL_JUDGE`.

Neither call sends your local-storage state (prompt drafts, best scores) anywhere. They live in your browser only.

## Threat surface

- **API key in `.env`.** Don't commit it. `.gitignore` excludes `.env`.
- **No authentication on `/api/run` and `/api/grade`.** Anyone who reaches the deployment can spend your OpenAI tokens. Put auth in front if you deploy publicly. A budget-aware rate limiter is in scope for v2.
- **No prompt-injection protection inside the student LLM call.** A student could craft a "prompt" that tries to manipulate the judge through the output. This is acceptable for v1 because the student is the user — they're only manipulating their own grade. If you build a multi-user version where students compete, you need to harden the judge prompt.
