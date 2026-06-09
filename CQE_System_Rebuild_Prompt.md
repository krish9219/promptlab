# Complete Rebuild Prompt — Call Quality Evaluation AI System

> Copy everything below this line and paste it to any GPT model to recreate the full application.

---

## PROMPT START

Build a **Call Quality Evaluation AI System** — a banking call-center QA platform built with Python + Flask. This is a production-grade web application, not a prototype. Every detail below must be implemented exactly as described.

---

## 1. TECHNOLOGY STACK

- **Backend**: Python 3.11+, Flask 3.x
- **Templating**: Jinja2 (Flask built-in)
- **Frontend**: Bootstrap 5.3.2 + Bootstrap Icons 1.11.3 (CDN), Chart.js 4.4.1 (CDN)
- **Storage**: JSON files only — NO database, NO SQLite, NO ORM
- **LLM**: NVIDIA NIM API (`https://integrate.api.nvidia.com/v1`), model `meta/llama-3.3-70b-instruct`
- **Dependencies** (`requirements.txt`): `flask>=3.0.0`, `python-dotenv>=1.0.0`, `requests>=2.31.0`
- **Config**: `.env` file loaded via `python-dotenv`
- **Port**: 5001 (default)

---

## 2. PROJECT FILE STRUCTURE

```
project_root/
├── app.py                          # Flask entry point + all routes
├── config.py                       # Central config loader from .env
├── storage.py                      # JSON persistence layer
├── ingestion.py                    # Background scheduler (threading)
├── routing.py                      # Human review routing policy engine
├── requirements.txt
├── .env                            # (user creates this — not committed)
├── data/                           # Auto-created
│   ├── calls.json
│   ├── ingestion_state.json
│   └── ingestion_runs.json
├── transcripts/                    # Default source folder for TXT files
├── agents/
│   ├── __init__.py
│   ├── batch_ingestion_agent.py
│   ├── pii_redaction_agent.py
│   ├── llm_evaluation_agent.py
│   ├── risk_routing_agent.py
│   └── human_review_agent.py
├── engines/
│   ├── __init__.py
│   ├── pii.py
│   ├── llm_evaluation.py
│   ├── llm_prompts.py
│   ├── evaluation.py
│   └── analysis.py
├── templates/
│   ├── base.html
│   ├── dashboard.html
│   ├── calls.html
│   ├── call_detail.html
│   ├── ingestion.html
│   ├── review.html
│   ├── 404.html
│   └── 500.html
└── static/
    └── css/
        └── styles.css
```

---

## 3. CONFIGURATION (config.py + .env)

All settings come from `.env`. `config.py` loads them with `load_dotenv()` and provides module-level constants.

### `.env` variables (with defaults):
```
NVIDIA_ENDPOINT_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.3-70b-instruct
NVIDIA_API_KEY=your_key_here
TRANSCRIPT_SOURCE_DIR=./transcripts
INGESTION_INTERVAL_SECONDS=60
INGESTION_BATCH_SIZE=30
NVIDIA_RATE_LIMIT_PER_MINUTE=36
LLM_TIMEOUT_SECONDS=90
LLM_MAX_TOKENS=512
REVIEW_ROUTING_POLICY=both
LOW_CONFIDENCE_THRESHOLD=65
PORT=5001
SECRET_KEY=callqa-sentinel-2024-secret
```

### `config.py` must also define:

**`FORCE_HIGH_RISK_KEYWORDS`** (list of strings) — if ANY of these appear in the redacted transcript, the call is forced to HIGH risk regardless of LLM output:
```python
FORCE_HIGH_RISK_KEYWORDS = [
    "fraud", "fraudulent",
    "unauthorized transaction", "unauthorized charge", "unauthorized transfer",
    "did not make this", "didn't make this", "never made this",
    "didn't authorize this", "did not authorize this",
    "legal threat", "legal action against", "taking legal action",
    "my lawyer", "my attorney", "i'll sue", "i will sue",
    "file a lawsuit", "rbi complaint",
]
```

**`SCENARIO_KEYWORDS`** (dict) — for auto-detecting call scenario from transcript keywords:
```python
SCENARIO_KEYWORDS = {
    "Unauthorized Transaction": ["unauthorized", "didn't make", "did not make", "didn't authorize", "did not authorize", "never made this"],
    "Fraud": ["fraud", "fraudulent", "scam", "hacked", "account compromised"],
    "Account Access Issue": ["can't access", "cannot access", "locked out", "reset password", "forgot password", "unable to login"],
    "Credit Card Problem": ["credit card", "card declined", "card not working", "card blocked"],
    "Loan Inquiry": ["loan", "personal loan", "home loan", "apply for loan"],
    "Balance Dispute": ["balance", "wrong balance", "incorrect balance", "balance statement"],
    "Overdraft Dispute": ["overdraft", "overdrawn", "over limit", "exceed limit"],
    "Escalation": ["escalate", "supervisor", "manager", "speak to someone higher"],
    "Legal Threat": ["legal", "court", "lawyer", "attorney", "sue", "lawsuit"],
    "Mortgage Payment Extension": ["mortgage", "payment extension", "defer payment", "extension on payment"],
}
```

Warn (via `warnings.warn`) at startup if `NVIDIA_API_KEY` is empty.

---

## 4. STORAGE LAYER (storage.py)

JSON file persistence with atomic writes (write `.tmp` then `rename`). No locking needed (single-process).

**Functions:**
- `load_all_calls() → list` — reads `calls.json`, returns `[]` on missing/corrupt
- `save_call(call: dict)` — upsert by `call["id"]`, writes `calls.json`
- `get_call(call_id: str) → dict | None` — linear search by id
- `clear_all_calls()` — writes empty list
- `load_ingestion_state() → dict` — reads `ingestion_state.json`
- `save_ingestion_state(state: dict)`
- `load_ingestion_runs() → list` — reads `ingestion_runs.json`
- `add_ingestion_run(run: dict)` — prepend, keep last 100 only
- `new_call_id() → str` — `str(uuid.uuid4())`
- `now_iso() → str` — UTC ISO-8601 string

Default ingestion state:
```python
{
    "processed_files": [],
    "scheduler_enabled": False,
    "interval_seconds": 60,
    "source_dir": "",
    "last_run_at": None,
    "total_processed": 0,
    "total_errors": 0,
}
```

---

## 5. CORE PROCESSING PIPELINE

Transcript files (`.txt`) are read from a configurable source folder. The pipeline runs 4 agents in strict order. **Raw transcript text NEVER reaches the LLM API — only the redacted evidence packet does.**

### Pipeline Order:
```
TXT File → [1] PII Redaction → [2] LLM Evaluation → [3] Risk Routing → [4] Storage
```

---

## 6. ENGINE: PII REDACTION (engines/pii.py)

### `redact_pii(text) → (redacted_text, count)`

Apply regex patterns in this exact order (order matters — specific before general):

| Pattern | Replacement Tag |
|---------|----------------|
| 16-digit card numbers (with optional spaces/dashes) | `[CARD_NUMBER]` |
| CVV/CVC/security code followed by 3-4 digits | `[CVV]` |
| IFSC code: 4 letters + 0 + 6 alphanumeric | `[IFSC_CODE]` |
| UPI IDs (`xxx@okaxis`, `@oksbi`, `@okicici`, `@okhdfcbank`, `@ybl`, `@ibl`, `@axl`, `@upi`, `@paytm`, `@phonepe`, `@apl`, `@waicici`) | `[UPI_ID]` |
| US SSN: `000-00-0000` | `[SSN]` |
| Aadhaar: 12 digits (with optional spaces every 4) | `[AADHAAR_NUMBER]` |
| PAN card: `AAAAA9999A` | `[PAN_NUMBER]` |
| Indian phone: 10 digits starting 6-9, optional `+91` or `0` prefix | `[PHONE_NUMBER]` |
| Email addresses | `[EMAIL_ADDRESS]` |
| Dates of birth: `DD/MM/YYYY`, `DD-MM-YYYY`, or long-form "January 15, 1990" | `[DATE_OF_BIRTH]` |
| Employee IDs: `EMP` + 4-8 digits | `[EMPLOYEE_ID]` |
| Ticket/Case/Incident numbers: `TKT/TICKET/CASE/INC/SR` + 4-10 digits | `[TICKET_NUMBER]` |
| Account numbers: standalone 9-18 digit numbers | `[ACCOUNT_NUMBER]` |
| Indian PIN codes: 6-digit numbers starting 1-9 | `[PIN_CODE]` |

Then apply **contextual name detection** using triggers like "my name is", "I am", "this is", "Mr./Mrs./Ms./Dr." — replace captured proper noun names with `[CUSTOMER_NAME]`.

Then apply **address detection** (street/avenue/road/lane/nagar/colony/sector) → `[ADDRESS]`.

Return `(redacted_text, total_count_of_replacements)`.

### `extract_signals(redacted_text) → dict`

Extract boolean signals from the **redacted** text (lowercase). Returns a dict with these exact keys:

**QA signals:**
- `greeting`: "hello", "good morning", "good afternoon", "welcome", "thank you for calling", "good evening"
- `verification`: "verify", "confirm", "account number", "date of birth", "registered mobile", "security question", "authentication"
- `empathy`: "understand", "sorry", "apologize", "apologies", "inconvenience", "frustrating", "i can see why", "that must be"
- `resolution`: "resolved", "fixed", "taken care", "processed", "will be credited", "refund", "arranged", "completed", "done", "reversed"
- `privacy_reminder`: "for security purposes", "verification purposes", "call is recorded", "privacy", "confidential", "security reasons"
- `closing`: "thank you for calling", "is there anything else", "have a good", "goodbye", "take care", "pleasure assisting"

**Risk signals (must indicate CUSTOMER-reported problems, not agent compliance language):**
- `fraud`: "fraud", "fraudulent", "scam", "hacked", "compromised"
- `unauthorized`: "unauthorized transaction", "unauthorized charge", "unauthorized transfer", "didn't make this", "did not make this", "never made this", "didn't authorize", "did not authorize", "i did not make", "i didn't make"
- `complaint`: "complaint", "complain", "unhappy", "dissatisfied", "terrible", "worst service"
- `escalation`: "escalate", "speak to a supervisor", "speak to supervisor", "speak to a manager", "speak to manager", "speak to someone higher", "transfer to a manager", "team leader", "your supervisor"
- `legal`: customer-specific threat phrases only: "i will sue", "i'll sue", "going to sue", "file a lawsuit", "filing a lawsuit", "legal action against", "taking legal action", "legal notice", "my lawyer", "my attorney", "contact my lawyer", "hiring a lawyer", "rbi complaint", "consumer forum", "going to court", "i'm going to report this to", "file a complaint with rbi"

### `detect_scenario(text) → str`
Match keywords from `config.SCENARIO_KEYWORDS`. Return the scenario with most keyword hits. Default: `"General Banking Inquiry"`.

### `extract_agent_name(raw_text) → str`
Search for agent self-introduction patterns ("my name is", "this is", "I'm", "agent:", "speaking"). Return first match with ≥3 chars. Default: `"Unknown Agent"`.

### `extract_outcome(redacted_text) → str`
- "Resolved" if: resolved/fixed/refund processed/credited/reversed/done
- "Escalated" if: escalated/transferred/supervisor/team leader
- "Pending Follow-up" if: pending/will get back/follow up/investigating
- Default: "Unresolved"

---

## 7. ENGINE: LLM PROMPTS (engines/llm_prompts.py)

### Evidence Packet

`build_evidence_packet(scenario, agent_name, outcome, signals, call_duration_lines) → dict`

Returns compact JSON structure sent to LLM:
```json
{
  "scenario": "...",
  "agent": "...",
  "outcome": "...",
  "transcript_lines": 42,
  "signals": {
    "qa": {
      "greeting": true/false,
      "verification": true/false,
      "empathy": true/false,
      "resolution": true/false,
      "privacy_reminder": true/false,
      "closing": true/false
    },
    "risk": {
      "fraud": true/false,
      "unauthorized": true/false,
      "complaint": true/false,
      "escalation": true/false,
      "legal": true/false
    }
  }
}
```

### LLM System Prompt

```
You are a banking call quality evaluator. You receive a compact evidence packet (no raw transcript, no PII) and return ONLY a JSON object with these 5 fields. No explanation, no markdown, no extra text — just the JSON.

Fields:
- qa_score: 0-100 based on QA signals (greeting, verification, empathy, resolution, privacy, closing)
- compliance_score: 0-100 based on verification done, privacy reminder, proper escalation
- confidence: 0-100 how certain you are given the available evidence
- sentiment: exactly one of Positive, Neutral, Negative
- risk: exactly one of LOW, MEDIUM, HIGH

QA scoring (qa_score):
- Each TRUE signal adds ~14-16 points. All 6 TRUE → 90-100. 5 → 75-89. 4 → 60-74. Fewer → proportionally lower.
- Unresolved outcome reduces qa_score by 15-20 points.

Compliance scoring:
- verification TRUE → +35 pts (critical). privacy_reminder TRUE → +20 pts.
- No fraud/legal/unauthorized → +20 pts. resolution TRUE → +15 pts. closing TRUE → +10 pts.
- Missing verification alone drops compliance to ≤50.

Risk scoring — use ALL of: scenario, outcome, AND signals together:
- LOW: Routine call. No fraud/unauthorized/legal signals. Outcome Resolved. Standard scenario.
- MEDIUM: Unresolved outcome OR customer escalation OR complaint signal OR mixed signals.
- HIGH: ONLY when confirmed fraud/unauthorized transaction OR explicit customer legal threat, combined with high-severity scenario AND unresolved/escalated outcome.
- Important: If outcome is 'Resolved' and QA indicators are strong, default to LOW or MEDIUM even if some risk signals are present.
- Escalation alone (customer asked for supervisor but issue was resolved) → MEDIUM, not HIGH.
```

### Retry Prompt
If first response is not valid JSON, send a stricter retry that shows the model its previous invalid output and demands raw JSON only.

---

## 8. ENGINE: LLM EVALUATION (engines/llm_evaluation.py)

`evaluate_with_llm(evidence: dict) → dict | None`

- Rate limit: `60 / NVIDIA_RATE_LIMIT_PER_MINUTE` seconds between calls (global `time.sleep`)
- HTTP POST to `{NVIDIA_ENDPOINT_URL}/chat/completions` with Bearer auth
- Payload: `model`, `messages`, `max_tokens=512`, `temperature=0.1`, `top_p=0.9`
- Timeout: `LLM_TIMEOUT_SECONDS`
- Retry up to `LLM_MAX_RETRIES + 1` total attempts
- On retry: use the stricter retry prompt with previous bad response
- JSON extraction: try direct parse → strip markdown fences → regex for `{...}` containing `"qa_score"`
- Validation: all 5 fields required, coerce to correct types, clamp integers 0-100, normalize sentiment/risk to valid values
- Returns `None` if all attempts fail (triggers local fallback)
- Handle these errors gracefully: Timeout, HTTPError, RequestException, JSONDecodeError

---

## 9. ENGINE: LOCAL FALLBACK EVALUATOR (engines/evaluation.py)

`evaluate_locally(signals, scenario, outcome) → dict`

**Design principle:** The LLM and this engine see exactly the same inputs — the compact evidence packet (signals + scenario + outcome). A well-tuned rule engine on identical inputs can closely match LLM accuracy. This evaluator mirrors the exact scoring rubric from the LLM system prompt, adds signal-combination logic, scenario-severity awareness, and outcome-interaction adjustments so its output is indistinguishable from the LLM in the vast majority of cases.

**Requirements:**
- Pure Python — zero external imports, zero I/O, sub-millisecond execution on any hardware
- Mirrors the LLM scoring rubric exactly (same weights, same band anchoring, same compliance gate)
- Signal-combination logic (not just presence counting): outcome × risk signal interactions
- Scenario-severity awareness: HIGH/MEDIUM severity scenarios get different adjustments
- Confidence range 50–88 (meaningfully higher than old 75 cap; slightly below LLM's possible 90+)

### Scenario severity constants:
```python
_HIGH_SEVERITY_SCENARIOS = frozenset({
    "Fraud", "Unauthorized Transaction", "Legal Threat",
})
_MEDIUM_SEVERITY_SCENARIOS = frozenset({
    "Escalation", "Overdraft Dispute", "Balance Dispute", "Mortgage Payment Extension",
})
```

### QA Score — mirrors LLM rubric exactly:
- Weighted per signal: greeting=14, verification=16, empathy=14, resolution=16, privacy_reminder=14, closing=14
- Band anchoring: 6 signals → max(score, 90). 5 → max(score, 76). 4 → max(score, 60).
- Outcome adjustment: Unresolved → -18. Escalated → -8. Resolved + ≥4 signals → +5 (capped at 100).
- High-severity scenario resolved with verification+resolution → +4 competency bonus.

### Compliance Score — verification is a hard gate:
- **No verification**: max 50. Award partial: privacy=+15, no-legal=+15, closing=+10.
- **With verification** (35 pts base):
  - privacy_reminder → +20
  - no legal signal → +20; legal signal → -10
  - no-unauthorized OR resolved → +15; unauthorized without resolution → -5
  - closing → +10
  - High-severity + escalation + resolved → +5 (proper protocol followed)
  - High-severity + risk signals + unresolved + no escalation → -8 (protocol gap)

### Risk Level — outcome × signal combination (mirrors LLM prompt note):
- `risk_signal_count = fraud + unauthorized + legal`
- **If risk_signal_count ≥ 1**:
  - Not resolved → HIGH
  - Resolved + qa_score < 55 → HIGH (resolved but performance was poor)
  - Resolved + high-severity scenario → MEDIUM (agent handled it properly)
  - Resolved + acceptable QA → MEDIUM (signal is contextual, not confirmed danger)
- **No risk signals**: complaint OR escalation → MEDIUM. Unresolved/Pending → MEDIUM. Medium-severity scenario + not resolved → MEDIUM. Else → LOW.
- **Override**: escalation alone + resolved → MEDIUM, never HIGH (mirrors LLM rubric note).
- **Override**: resolved + qa≥75 + no risk signals → LOW.

### Sentiment — multi-factor matching LLM contextual reasoning:
- Negative: (complaint OR legal) AND (Unresolved OR Escalated)
- Negative: (fraud OR unauthorized) AND outcome ≠ Resolved
- Negative: (complaint OR escalation) AND not resolved
- Positive: Resolved AND resolution signal AND no complaint AND qa_score ≥ 68
- Neutral: fraud/unauthorized resolved (customer relieved but not positively satisfied)
- Neutral: all other cases

### Confidence — signal clarity + consistency (range 50–88):
- Base: `52 + (qa_signal_count * 5)` → 52–82 range
- Boost +8: risk==HIGH AND (unresolved or escalated) → consistent signals
- Boost +8: risk==LOW AND resolved AND qa_signal_count ≥ 4 → clear positive case
- Boost +3: risk==MEDIUM → moderately clear
- Reduce -8: risk signals present AND resolved → ambiguous combination
- Reduce -5: high-severity scenario AND qa_signal_count ≤ 2 → sparse evidence
- Final clamp: `max(50, min(88, confidence))`

Also implement these score-expansion functions (used for all calls, live-LLM or fallback):

### `build_qa_checklist(signals, qa_score) → list`
6 items with: `criteria`, `passed` (bool), `weight` (int), `notes` (str)
1. Professional greeting — weight 15
2. Customer identity verification — weight 20
3. Empathy and active listening — weight 15
4. Clear problem identification and resolution — weight 20
5. Privacy and security reminder — weight 15
6. Professional closing — weight 15

### `build_compliance_checklist(signals, compliance_score) → list`
6 items with: `criteria`, `passed`, `regulation` (str), `severity` (str), `notes`
1. Account access requires identity verification — RBI KYC Guidelines — Critical
2. No sensitive data shared before authentication — RBI Data Localisation — Critical
3. Fraud/unauthorized transaction protocol followed — RBI Circular on Unauthorized Transactions — High
4. Proper escalation path used — Internal Escalation Policy — Medium
5. Legal/regulatory complaint acknowledgment — Consumer Protection Act — Critical
6. Call recording disclosure — TRAI Call Recording Norms — Medium

### `build_coaching(signals, qa_score, compliance_score, scenario) → dict`
Returns `{"strengths": [...], "weaknesses": [...], "recommendations": [...]}`.
- Strengths: what signals passed
- Weaknesses: what signals failed
- Recommendations: scenario-specific advice, risk-specific protocols, score-based training recommendations
- At least 1 item in each list always

### `build_score_explanation(scores, signals, scenario, model_mode) → str`
Plain-English explanation of how scores were calculated. Mention: mode (live-llm vs local-fallback), QA signal count out of 6, compliance basis, confidence meaning, risk signal count.

---

## 10. ENGINE: ROUTING (routing.py)

### `apply_safety_overlay(risk, redacted_text) → (final_risk, override_reason | None)`
Check `FORCE_HIGH_RISK_KEYWORDS` (case-insensitive). If any match and risk ≠ HIGH, return `("HIGH", "Safety overlay: keyword '...' detected")`. Else return `(risk, None)`.

### `should_route_to_human(risk, confidence, policy=None) → (bool, str)`
Policy options:
- `"both"` (default): HIGH risk OR confidence < LOW_CONFIDENCE_THRESHOLD → True
- `"high_risk_only"`: HIGH risk only
- `"low_confidence_only"`: confidence below threshold only

Return `(needs_review: bool, reason: str)`.

### `get_review_priority(risk, qa_score, compliance_score) → str`
- HIGH risk + (qa<60 or compliance<60) → "critical"
- HIGH risk → "high"
- MEDIUM risk → "normal"
- LOW risk → "low"

---

## 11. AGENTS

### agents/batch_ingestion_agent.py

`run_batch(source_dir=None, batch_size=None) → dict`

- Load state (processed_files list = cursor)
- Discover `*.txt` files in source_dir, skip already-processed filenames
- Process up to `batch_size` new files
- For each file: run `_process_single_file()`
- Update state (add to processed_files, increment counts)
- Append run record to ingestion_runs history
- Return summary: `{status, run_at, files_found, files_done, files_failed, call_ids, errors, message}`

`_process_single_file(txt_file, policy=None) → dict`

Runs the full pipeline:
1. Read raw text from file
2. `pii_agent.process(raw_text, filename)`
3. `llm_agent.process(pii_result)`
4. `routing_agent.process(eval_result, redacted_transcript, policy=policy)`
5. `build_risk_flag_analysis(...)`, `build_sentiment_analysis(...)`, `build_qa_scorecard(...)` from analysis engine
6. Assemble complete call record dict with ALL fields listed in section 14
7. `storage.save_call(call)`

Maintain in-memory `_agent_status` dict with keys: `batch_ingestion`, `pii_redaction`, `llm_evaluation`, `risk_routing`. Each has: `status` ("idle"/"running"/"error"), `last_run`, `processed`, `errors`. `get_agent_statuses()` returns this dict for dashboard display.

### agents/pii_redaction_agent.py

`process(raw_text, filename) → dict`

Calls `redact_pii()`, `extract_signals()`, `detect_scenario()`, `extract_agent_name(raw_text)` (note: name extraction uses **raw** text), `extract_outcome(redacted)`. Returns: `{redacted_transcript, pii_count, signals, scenario, agent_name, outcome, line_count, status, error}`.

### agents/llm_evaluation_agent.py

`process(pii_result) → dict`

1. `build_evidence_packet(...)` from signals/scenario/outcome/line_count
2. `evaluate_with_llm(evidence)` — primary path
3. If None → `evaluate_locally(signals, scenario, outcome)` — fallback
4. Track `model_mode`: "live-llm" or "local-fallback"
5. Build `qa_checklist`, `compliance_checklist`, `coaching`, `score_explanation` (application builds these, not LLM)
6. Build `llm_summary` string: "Call evaluated via {mode}. QA: X/100 | Compliance: X/100 | Confidence: X% | Sentiment: X | Risk: X"
7. Return all scores + checklists + coaching + llm_summary + model_mode + fallback_reason

### agents/risk_routing_agent.py

`process(eval_result, redacted_transcript, policy=None) → dict`

1. `apply_safety_overlay(risk, redacted_transcript)`
2. `should_route_to_human(final_risk, confidence, policy)`
3. If needs_review → `review_status = "pending"`, `priority = get_review_priority(...)`
4. Else → `review_status = "auto_approved"`, `priority = "low"`
5. Return: `{risk, risk_overridden, override_reason, needs_review, routing_reason, review_status, sla_priority, status}`

### agents/human_review_agent.py

`get_review_queue() → list` — all calls with `review_status == "pending"`, sorted by SLA priority (critical→high→normal→low).

`get_queue_stats() → dict` — `{total_pending, critical_count, high_count, normal_count, low_count}`

`submit_review(call_id, form_data) → dict`

Validate form:
- `decision`: must be "approve" or "escalate"
- `sla_priority`: must be "low"/"normal"/"high"/"critical"
- `approved_by`: required, non-empty string
- `qa_override` and `compliance_override`: optional, if provided must be 0-100 integer
- Approve requires `attestation` checkbox = true

Build `human_review` record: `{qa_override, compliance_override, sla_priority, decision, root_cause, coaching_owner, reviewer_comments, approved_by, attestation, reviewed_at}`

Update call: `review_status = "approved"` (decision=approve) or `"escalated"`. Apply score overrides to `qa_score_final` / `compliance_score_final` if provided. Save call.

Prevent overwriting an already-approved call (return error).

---

## 12. ENGINE: ENHANCED ANALYSIS (engines/analysis.py)

Three analysis sections built from existing call data — **no additional LLM calls**. These are called from `batch_ingestion_agent._process_single_file()`.

### Transcript Parsing

Parse transcript turns using regex: `\[HH:MM:SS\] (Agent|Customer) Name: text`

Each turn: `{speaker, name, ts_sec, text}`

### `build_risk_flag_analysis(signals, risk, compliance_score, redacted_transcript, pii_count) → dict`

Returns:
```python
{
  "overall_risk": str,
  "security_checks": [...],   # 9 items
  "risk_flags": [...],        # 5 items
  "final_verdict": str,       # "Action Required" | "Monitor" | "No Action Required"
  "verdict_level": str,       # "danger" | "warning" | "success"
  "checks_passed": int,
  "checks_total": int,
}
```

**9 Security Checks** (each has `check`, `status` [pass/fail/warning], `comment`):
1. Authentication Performed
2. PII Correctly Redacted
3. Full SSN Not Requested (detect if agent REQUESTED it using "please provide your", "can you give me your", etc.)
4. Password Not Requested
5. OTP Not Requested
6. Card Details Not Requested
7. Regulatory Compliance (based on compliance_score and legal signal)
8. No Financial Misrepresentation
9. Data Privacy Reminder Given

**5 Risk Flag Types** (each has `type`, `severity` [None/Low/Medium/High], `notes`):
1. PII Exposure
2. Social Engineering
3. Fraud Indicators
4. Compliance Violation
5. Customer Vulnerability

**Final Verdict logic**: HIGH risk OR ≥2 failed checks → "Action Required". MEDIUM risk OR 1 failed check OR medium severity flag → "Monitor". Else → "No Action Required".

**IMPORTANT — Agent request detection**: When checking if an agent requested sensitive data, look for REQUEST verbs ("please provide your", "please give me your", "can you give me your", "what is your", "tell me your", "read me your", "share your", "could you tell me your", "i need your", "please share your", "confirm by providing", "verify by telling", "enter your") combined with the sensitive term. Do NOT flag warnings/reminders as requests.

### `build_sentiment_analysis(signals, sentiment, outcome, redacted_transcript, qa_score) → dict`

Parse customer turns. Divide into beginning/middle/end thirds.

Returns:
```python
{
  "beginning": {"label": str, "quote": str|None},
  "middle":    {"label": str, "quote": str|None},
  "end":       {"label": str, "quote": str|None},
  "emotion_timeline": [...],   # list of {phase, emotion} dicts
  "scores": {
    "satisfaction": int,   # 10-98
    "frustration":  int,   # 3-80
    "trust":        int,   # 10-98
    "confidence":   int,   # 20-98
  },
  "overall": str,   # Positive/Neutral/Negative
}
```

**Emotion Timeline phases**: Opening, Verification, Issue Discussion, Resolution, Closing.

**Phase labels** — driven by header sentiment extracted from transcript header (`Sentiment: anxious/positive/frustrated/etc.`) combined with signals and outcome. For the beginning: anxious/worried header → "Anxious", frustrated/angry → "Frustrated", positive/cooperative → "Cooperative". For end: Resolved outcome → "Satisfied"/"Very Satisfied". Escalated → "Hopeful". Pending → "Cautiously Optimistic".

**Sentiment Scores** — use header sentiment as the baseline with lookup tables:
- Positive/cooperative headers → high satisfaction (78-85), low frustration (8-10)
- Anxious/worried → mid satisfaction (58-60), mid frustration (32-35)
- Frustrated/angry → low satisfaction (40-48), high frustration (52-60)
Then apply signal adjustments: resolved outcome → +12 satisfaction, complaint → -20, escalation → -15. Frustration: complaint → +20, escalation → +18, resolved → -10.

### `build_qa_scorecard(signals, qa_score, compliance_score, scenario, redacted_transcript) → dict`

**7 Categories** (weighted):
1. Opening & Greeting — 10 pts: greeting (5), name introduction (5)
2. Verification & Security — 20 pts: identity (10), privacy reminder (10)
3. Active Listening — 15 pts: empathy acknowledged (5), empathy language (5), confirmed goal (5)
4. Resolution Accuracy — 20 pts: issue identified (5), action explained (5), scenario-relevant advice (5), customer confirmed (5)
5. Communication Skills — 15 pts: clear language (5), professional tone (5), confident delivery (5)
6. Ownership & Follow-Up — 10 pts: timeline set (5), follow-up guidance (5)
7. Closing — 10 pts: offered assistance (5), professional closing (5)

**Rating bands**: ≥95 → "Exceptional", ≥90 → "Exceeds Expectations", ≥85 → "Meets Expectations", ≥75 → "Developing", <75 → "Needs Improvement".

Also return:
- `qa_checklist_sections`: dict with keys Opening, Verification, Customer Need, Resolution, Compliance, Closing — each a list of `{label, passed}` items
- `ai_flags`: 6 items with `{flag, status (pass/warning/fail), label}`: Compliance Risk, Security Risk, Customer Experience Risk, Transcript Quality, Resolution Success, Customer Satisfaction Probability
- `final_verdict_items`: 4 items: Issue Resolved, Customer Satisfied, Compliance Maintained, No Security Breach

### `build_agent_coaching_needs(calls) → list`

Aggregate across all calls per agent. Include agent in coaching list only if avg_qa < 75 OR avg_compliance < 70. For each under-performing agent:
- Identify `gaps` (areas missed in ≥25-40% of their calls — thresholds: verification 25%, resolution 30%, empathy 35%, greeting 35%, privacy 40%, closing 40%)
- Assign `priority`: high (avg_qa<60), medium (avg_qa<70), low
- Map each gap to a `recommendation` string
- Return sorted by priority then avg_qa ascending

---

## 13. INGESTION SCHEDULER (ingestion.py)

Background threading with `threading.Thread(daemon=True)`.

- `start_scheduler()`: start thread if not already running
- `stop_scheduler()`: set stop event
- `is_scheduler_running() → bool`
- `toggle_scheduler(enabled, source_dir=None, interval=None) → dict`: persist to state, start/stop

The scheduler loop: load state, check `scheduler_enabled`, run `run_batch()`, wait `interval_seconds` (check stop_event every 1 second). Restore scheduler state on Flask app startup (check state file, restart if was enabled).

---

## 14. COMPLETE CALL RECORD SCHEMA

Every saved call has ALL of these fields:
```python
{
    "id":                   str,    # UUID
    "transcript_id":        str,    # filename without extension
    "filename":             str,    # original filename
    "redacted_transcript":  str,    # PII-safe version ONLY — raw never stored
    "pii_count":            int,
    "scenario":             str,
    "agent_name":           str,
    "outcome":              str,    # Resolved/Escalated/Pending Follow-up/Unresolved
    "signals":              dict,   # all 11 boolean signals
    "evidence_packet":      dict,   # compact JSON sent to LLM
    "qa_score":             int,
    "compliance_score":     int,
    "confidence":           int,
    "sentiment":            str,    # Positive/Neutral/Negative
    "risk":                 str,    # LOW/MEDIUM/HIGH
    "model_mode":           str,    # "live-llm" or "local-fallback"
    "fallback_reason":      str | None,
    "qa_checklist":         list,
    "compliance_checklist": list,
    "coaching":             dict,   # {strengths, weaknesses, recommendations}
    "score_explanation":    str,
    "llm_summary":          str,
    "needs_review":         bool,
    "routing_reason":       str,
    "risk_overridden":      bool,
    "override_reason":      str | None,
    "review_status":        str,    # pending/auto_approved/approved/escalated
    "sla_priority":         str,    # critical/high/normal/low
    "risk_analysis":        dict,   # from build_risk_flag_analysis
    "sentiment_analysis":   dict,   # from build_sentiment_analysis
    "qa_scorecard":         dict,   # from build_qa_scorecard
    "human_review":         dict | None,  # filled by reviewer
    "ingested_at":          str,    # ISO timestamp
    "evaluated_at":         str,    # ISO timestamp
    # Added after human review:
    "qa_score_final":       int | None,
    "compliance_score_final": int | None,
    "reviewed_at":          str | None,
}
```

---

## 15. FLASK ROUTES (app.py)

### Context Processor
Inject into every template:
- `nvidia_model`: last segment of model name
- `nvidia_status`: bool (API key set)
- `routing_policy`: current policy
- `pending_count`: count of calls with `review_status == "pending"`
- `now`: UTC datetime string

### Routes

| Method | URL | Handler |
|--------|-----|---------|
| GET | `/` | Redirect to `/dashboard` |
| GET | `/dashboard` | Dashboard with filters |
| GET | `/ingestion` | Ingestion console |
| POST | `/ingestion/run` | Trigger manual batch run |
| POST | `/ingestion/scheduler` | Enable/disable scheduler |
| POST | `/ingestion/update-policy` | Change routing policy |
| POST | `/ingestion/update-folder` | Change source folder |
| GET | `/calls` | Call register with filters |
| GET | `/calls/<id>` | Call detail page |
| GET | `/review` | Human review queue |
| GET/POST | `/review/<id>` | Review form (POST submits review) |
| GET | `/api/dashboard-stats` | JSON stats |
| GET | `/api/agent-status` | JSON agent statuses |
| GET | `/api/queue-stats` | JSON queue stats |
| GET | `/api/calls/<id>` | JSON single call |
| GET | `/download/source` | Serve downloadable source zip |
| GET | `/download/prompt` | Serve `REBUILD_PROMPT.md` as a downloadable file |

### Dashboard Filters
Filter by: `agent`, `sentiment`, `risk`, `review_status`, `model_mode` (all optional, from GET params).

### Dashboard Statistics Computed
- `total_calls`, `avg_qa`, `avg_compliance`, `avg_confidence`
- `human_review_count` (pending)
- `total_pii`
- `live_llm_count`, `fallback_count`
- `risk_high`, `risk_medium`, `risk_low`
- `sentiment_positive`, `sentiment_neutral`, `sentiment_negative`
- `qa_trend`: last 10 calls sorted by ingested_at → `[{label, qa, compliance}, ...]`
- `agent_scores`: avg QA per agent, sorted descending
- `top_performers`: top 5 agents with ≥2 calls
- `coaching_needs`: from `build_agent_coaching_needs()`
- `recent_calls`: last 20 calls sorted newest first

### Call Register Filters
Filter by: `search` (transcript_id, scenario, agent_name), `risk`, `status` (review_status), `sentiment`, `agent`, `model_mode`. Sort newest first.

---

## 16. UI LAYOUT (templates + static/css/styles.css)

### Layout: Two-column fixed sidebar

```
┌──────────────────────────────────────────────────────┐
│  SIDEBAR (fixed, dark)  │  MAIN CONTENT              │
│                         │  ┌────────── TOPBAR ───┐   │
│  [Shield Icon]          │  │ Page Title  [Model] │   │
│  Call Quality AI        │  └─────────────────────┘   │
│  Evaluation System      │                             │
│                         │  [Flash Messages]           │
│  ── Analytics ──        │                             │
│  Dashboard              │  [Page Content]             │
│  Call Register          │                             │
│                         │                             │
│  ── Operations ──       │                             │
│  Auto Ingestion         │                             │
│  Human Review [badge]   │                             │
│                         │                             │
│ 
│  ● NVIDIA Live          │                             │
└──────────────────────────────────────────────────────┘
```

Sidebar: dark navy/slate background (`#0f172a`), white text. Active nav link has a colored left border accent. The Human Review nav link shows a red badge with pending count when > 0.

**Sidebar footer has two download buttons:**
1. "Download Source Code" → `GET /download/source` — serves `cqe_system.zip` from `static/`
2. "Download Rebuild Prompt" → `GET /download/prompt` — serves `REBUILD_PROMPT.md` as `CQE_System_Rebuild_Prompt.md`. Styled with indigo accent (`rgba(99,102,241,0.15)` background, indigo border + text). Use `send_from_directory(app.root_path, "REBUILD_PROMPT.md", as_attachment=True, download_name="CQE_System_Rebuild_Prompt.md")`.

Topbar: white background, page title on left, NVIDIA model badge + UTC time on right.

Mobile: sidebar hidden, hamburger button to toggle `.sidebar-open` class.

### Custom CSS (styles.css) must include:
- `.sidebar` — fixed left, 260px wide, dark background
- `.sidebar-brand` with icon + text
- `.nav-link` + `.active` state
- `.sidebar-footer` with status dot
- `.main-content` — margin-left: 260px
- `.topbar` — sticky top bar
- `.kpi-card` — white card with icon, value (large), label, optional bar
- `.score-card` — compact score display
- `.kpi-bar` + `.kpi-bar-fill` — progress bar inside KPI cards
- `.score-bar` + `.score-bar-fill` — thinner bars
- `.risk-badge` — colored pill: `.risk-high` (red), `.risk-medium` (orange), `.risk-low` (green)
- `.status-badge` — pill: `.status-pending` (yellow), `.status-approved` (green), `.status-escalated` (red), `.status-auto_approved` (blue)
- `.filter-bar` — sticky filter form bar with light background
- `.agent-card` — agent status card for ingestion console
- `.font-mono` — monospace font class
- Custom scrollbar styling

### dashboard.html

**Section 1 — Filter Bar**: dropdowns for Agent, Sentiment, Risk, Review Status, Model Mode. Apply + Clear buttons.

**Section 2 — KPI Cards** (4 cards in a row):
1. Total Calls (blue phone icon)
2. Avg QA Score /100 with progress bar (green)
3. Avg Compliance /100 with progress bar (info blue)
4. Avg Confidence % with progress bar (purple)

**Section 3 — Secondary KPI row** (4 more cards):
1. Pending Review count (warning yellow)
2. Total PII Redacted (danger red)
3. Live LLM count (success green)
4. Local Fallback count (secondary gray)

**Section 4 — Charts row** (2 columns):
- Left: Line chart — QA Trend (last 10 calls, dual lines: QA + Compliance using Chart.js)
- Right: Doughnut chart — Risk Distribution (HIGH/MEDIUM/LOW)

**Section 5 — Agent Leaderboard + Stats** (2 columns):
- Left: Agent Leaderboard table (rank, name, avg QA, call count, color-coded bar)
- Right: Sentiment Distribution (3 progress bars) + Risk Summary (3 progress bars)

**Section 6 — Agent Coaching Needs**: table of agents needing coaching — name, calls, avg QA, avg compliance, priority badge, gaps (comma-separated), recommendation

**Section 7 — Agent Pipeline Status**: cards for each of the 4 agents showing name, icon, status badge (idle/running/error), last run time, processed count, error count

**Section 8 — Recent Calls Table**: last 20 calls — transcript_id (monospace), scenario, agent, risk badge, status badge, QA score, compliance score, model mode badge, time ago, detail link

### calls.html

**Filter Bar**: search text input, Risk dropdown, Status dropdown, Sentiment dropdown, Agent dropdown, Model Mode dropdown.

**Results Table**: sortable-looking table — transcript_id (mono link), scenario, agent, risk badge, review status badge, QA, compliance, confidence, sentiment, model mode, date. Show total count and filtered count.

### call_detail.html

**Header**: Back button, transcript_id (mono), scenario, "Safety Override Applied" badge (if overridden), risk badge, status badge, model mode badge, "Review Now" button (if pending).

**Score Row** (4 score cards): QA Score, Compliance Score, Confidence, Sentiment. Show `qa_score_final` if human override applied; show "Overridden from X" label.

**5 Tabs**: Overview, Risk Analysis, Sentiment Analysis, QA Scorecard, Human Review

**Tab 1 — Overview**:
- LLM Summary bar
- Score Explanation text
- Agent info row: Agent Name, Scenario, Outcome, PII Count, Model Mode
- Routing info: routing_reason, sla_priority, override_reason (if any)
- Redacted Transcript (scrollable, monospace, max-height 400px)
- Coaching section: Strengths (green), Weaknesses (red), Recommendations (blue) — each as badge-pills

**Tab 2 — Risk Analysis**:
- Overall verdict badge (Action Required / Monitor / No Action Required)
- Security Checks table (9 rows): check name, pass/fail/warning icon, comment
- Risk Flags table (5 rows): type, severity colored badge, notes
- Checks passed counter

**Tab 3 — Sentiment Analysis**:
- 3-phase journey bar (Beginning → Middle → End) with labels and customer quotes
- Emotion Timeline: horizontal phases list with emotion labels
- 4 sentiment score bars (Satisfaction, Frustration, Trust, Confidence) — color-coded

**Tab 4 — QA Scorecard**:
- Overall score display with rating label and icon
- 7 category cards: category name, icon, earned/max points, progress bar, sub-criteria checklist
- QA Checklist Sections (accordion or tabs): Opening, Verification, Customer Need, Resolution, Compliance, Closing
- AI Flags row: 6 flag cards with pass/warning/fail status
- Final Verdict 4-item checklist

**Tab 5 — Human Review**:
- If review_status == "pending": show the review form
- If already reviewed: show the review record (decision, reviewer, scores, comments, timestamp)

**Review Form** (POST to `/review/<call_id>`):
- Decision: radio — Approve / Escalate
- SLA Priority: select — Low/Normal/High/Critical
- QA Score Override: number input (optional, 0-100)
- Compliance Override: number input (optional, 0-100)
- Root Cause: text input
- Coaching Owner: text input
- Reviewer Comments: textarea
- Approved By: text input (required)
- Attestation: checkbox "I confirm I have reviewed this call and my decision is final"
- Submit button

### ingestion.html

**Status Cards**: Running/Stopped status, last run time, total processed, total errors, source folder.

**Panel 1 — Manual Run**: source folder override input + "Run Now" button (POST to `/ingestion/run`)

**Panel 2 — Scheduler**: enable/disable toggle form, interval seconds input, source dir input. Show current scheduler state.

**Panel 3 — Routing Policy**: 3 radio buttons (Both: High Risk OR Low Confidence, High Risk Only, Low Confidence Only). Current policy highlighted. POST to `/ingestion/update-policy`.

**Panel 4 — Folder Settings**: text input for source_dir, save button. POST to `/ingestion/update-folder`.

**Run History Table**: last 10 runs — date/time, source dir, files found, done, failed, status.

**Configuration Summary**: show current config values (batch size, rate limit, interval, low confidence threshold).

### review.html

**Queue Stats Bar**: Total Pending, Critical, High, Normal, Low counts.

**Queue Table**: sorted by priority — each row has transcript_id (mono link), scenario, agent, risk badge, SLA priority badge, routing reason, ingested time. "Review" button links to `/calls/<id>#review-form`.

Empty state message if queue is empty.

---

## 17. TRANSCRIPT FILE FORMAT

TXT files in the source folder follow this format (parse for the header metadata):

```
Call ID: call_xxx
Date: YYYY-MM-DD
Agent: AgentName (ID: EMP0001)
Customer: CustomerName (ID: [CUSTOMER_NAME])
Scenario: Unauthorized Transaction
Sentiment: anxious
Outcome: Resolved | Agent processed chargeback and blocked card
Duration: ~12 minutes

[00:00:05] Agent AgentName: Good morning, thank you for calling...
[00:00:12] Customer CustomerName: Hello, I need help with...
...
```

The `Sentiment:` and `Outcome:` header fields are used by the sentiment analysis engine to anchor emotion timeline phase labels.

---

## 18. TRANSCRIPT EXAMPLES (create 8-10 sample files in `/transcripts/`)

Create sample transcripts covering these scenarios with realistic banking dialogue (10-25 lines each):
1. Unauthorized transaction — customer anxious, resolved with chargeback
2. Fraud report — customer upset, card blocked, escalated
3. Account access/password reset — straightforward, resolved
4. Credit card declined — resolved in single call
5. Loan inquiry — informational, cooperative
6. Overdraft dispute — fee waived, positive outcome
7. Legal threat — escalated, high risk
8. Mortgage payment extension — approved with conditions

Each file should:
- Include the header block (Call ID, Date, Agent, Customer, Scenario, Sentiment, Outcome, Duration)
- Have agent name matching `Agent AgentName (ID: EMP...)` so name extraction works
- Include timestamped turns in `[HH:MM:SS] Agent/Customer Name: text` format
- Contain enough keywords to trigger correct scenario detection and signal extraction
- Have agent names like: Priya, Rahul, Ananya, Vikram, Meena, Arjun — to populate the agent leaderboard

---

## 19. KEY DESIGN PRINCIPLES

1. **Security first**: Raw transcript NEVER stored or sent to any API. Only the compact redacted evidence packet goes to NVIDIA.
2. **LLM is primary**: Use the LLM for all evaluations. Local rule-based fallback is last resort only.
3. **Deterministic routing**: The application — never the LLM — decides if a call needs human review.
4. **Safety overlay**: Dangerous keywords always force HIGH risk, regardless of LLM output.
5. **No database**: All persistence via JSON files with atomic writes.
6. **Scheduler off by default**: Auto-ingestion scheduler must be explicitly enabled; never starts automatically except to restore state after restart.
7. **Human review is final**: The human reviewer's decision cannot be overwritten after approval.
8. **Score expansion in application**: QA checklists, coaching, explanations are built by application logic — not by additional LLM calls.
9. **Agent signal detection**: When checking if an agent requested sensitive data, look for REQUEST verbs + sensitive term combinations — not just the presence of the sensitive word.
10. **High-fidelity fallback**: The local fallback mirrors the exact LLM scoring rubric (same weights, same bands, same compliance gate, same risk combination logic). It is not a simple signal counter — it uses scenario-severity awareness, outcome × signal interaction logic, and confidence scoring up to 88%. The LLM and the local evaluator see identical inputs (the evidence packet), so a well-tuned rule engine achieves near-identical output. Confidence is capped at 88 (vs LLM's possible 90+) only because edge cases in the rule engine cannot match the LLM's full contextual reasoning.

---

## 20. STARTUP AND RUNNING

```bash
pip install -r requirements.txt
# Create .env with NVIDIA_API_KEY=your_key
python app.py
# → Running on http://0.0.0.0:5001
```

Place `.txt` transcript files in the `transcripts/` folder, go to `/ingestion`, and click "Run Now" to process them. The dashboard and call register will populate immediately.

---

## PROMPT END
