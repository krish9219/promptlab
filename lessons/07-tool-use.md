---
id: tool-use
title: Tool use and ReAct
level: 3
index: 7
estimatedMinutes: 15
assignment:
  task: Write a system prompt for an agent that has two tools (search(query) and calculator(expression)) and answers research questions. The prompt must teach the agent when to use each tool, how to compose them, and what the final answer format should be. The agent must NOT invent facts — it must search for them. Use {{input}} for the question.
  testInput: "How many seconds does it take light to travel from Earth to the Moon at the average distance? Show your work."
  studentSystem: |
    You have access to two tools:
      - search(query): returns 1-3 sentences of relevant factual information.
      - calculator(expression): returns the numeric result of a Python arithmetic expression.
    For this practice run, instead of actually calling tools, respond AS IF you used them by inserting fake-but-plausible tool results in this format: [search("query")] -> result text [/search]
rubric:
  - criterion: Defines clear tool-use criteria
    weight: 3
    description: Prompt tells the agent when to search vs calculate.
  - criterion: Forbids invented facts
    weight: 3
    description: Prompt explicitly tells the agent it must use search for factual lookups, not its own knowledge.
  - criterion: Specifies final answer format
    weight: 2
    description: Prompt specifies how the final answer should look (e.g., numeric + units + brief explanation).
  - criterion: Includes iteration cap or stop condition
    weight: 2
    description: Prompt addresses when to stop (e.g., "make at most 3 tool calls").
  - criterion: Output actually invokes both tools sensibly
    weight: 2
    description: For the test question, the output should call search (for the distance) and calculator (for the division).
---

An agent is an LLM in a loop with tools. The loop runs:

1. LLM picks a tool to call (or decides it has the answer).
2. Runtime executes the tool, returns the result.
3. Result goes back to the LLM as context.
4. Repeat until the LLM emits a final answer, or you hit a cap.

The prompt you write for an agent determines whether this loop is graceful or chaotic.

## The structure that works

```
You are an agent that answers questions using tools.

Tools available:
- search(query: string) -> string: returns 1-3 sentences of factual info
- calculator(expression: string) -> number: evaluates arithmetic

Rules:
- If the answer requires a fact you don't know with certainty, use search.
- If the answer requires arithmetic, use calculator.
- You may call tools in any order, up to 4 times total.
- When you have enough information, give the final answer.

Output format for a final answer:
  ANSWER: <one-sentence answer with units>
  REASONING: <2-3 sentences showing how you got there>

Question: {{input}}
```

Three load-bearing pieces:

1. **Tool descriptions with types.** Models follow type signatures the way they follow few-shot examples — by pattern.
2. **Explicit when-to-use rules.** Without them, agents either over-tool (search for trivia) or under-tool (invent facts).
3. **Stop condition.** Iteration caps prevent loop-of-doom.

## ReAct: the format that won

ReAct (Reason + Act) is a specific output format that interleaves thought and action:

```
Thought: I need to know the distance from Earth to the Moon.
Action: search("average Earth-Moon distance in km")
Observation: The average distance is 384,400 km.
Thought: I also need the speed of light.
Action: search("speed of light in km/s")
Observation: 299,792 km/s.
Thought: Now divide.
Action: calculator("384400 / 299792")
Observation: 1.282
Final Answer: It takes about 1.28 seconds for light to travel from Earth to the Moon at the average distance.
```

This format pre-dates modern tool-calling APIs but the principle survived: **make the model write its reasoning, name a tool, and consume the result before continuing**.

## What goes wrong without good prompting

- The model invents a `search` result rather than admitting uncertainty.
- The model calls `calculator` with English instead of arithmetic ("12 plus 5").
- The model loops forever on the same query.
- The model gives a final answer before checking facts.

Each of these is fixable with a single line in the prompt. The trick is *anticipating* which failure mode applies to your tools.

## What you'll do

Write a system prompt for an agent with `search` and `calculator`. The grader runs your prompt against a "how many seconds for light to travel to the Moon" question and checks whether the agent (a) used search to get the distance, (b) used the calculator for the math, (c) refused to invent the distance from its own training data.
