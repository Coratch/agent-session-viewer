# Single Session Time Diagnosis With Prompt Packs And Claude-p

Date: 2026-05-13
Status: design approved for planning

## Context

`agent-session-viewer` currently reads local Claude Code and Codex JSONL sessions, normalizes turns, shows session details in the Web UI, and can generate rule-based recap/export output with redaction. The next product step is no longer rule-only recap. The current direction is LLM-assisted single-session analysis, starting with the question the user cares about most:

> Why did this agent conversation take so long?

The first implementation should prove the local flow with `claude -p` headless mode before adding other model providers.

## Goals

- Add one-click analysis for one selected session.
- Make the default analysis template `Time Diagnosis`.
- Let users choose a built-in prompt template or provide a custom prompt.
- Let users choose an LLM provider in the UI, with only `Claude Code CLI (claude -p)` enabled in the first version.
- Use structured output so analysis results are machine-readable and renderable.
- Treat all session content as untrusted evidence to reduce prompt injection risk.
- Keep redaction and evidence boundaries mandatory before sending data to an LLM.

## Non-Goals

- Multi-session or project-wide analysis.
- OpenAI-compatible, Ollama, or remote gateway execution in the first implementation.
- Letting Claude read raw JSONL files directly.
- Letting analysis prompts use tools, edit files, or run commands.
- Replacing existing recap/export behavior.

## Product Shape

In the session detail view, add an `Analyze` control near the existing refresh controls or metrics rail.

The analysis panel contains:

- Template selector, defaulting to `耗时原因诊断`.
- LLM selector, defaulting to `Claude Code CLI`.
- Optional custom prompt field.
- Run button and running/error states.
- Result sections:
  - Summary
  - Duration breakdown
  - Top delay segments
  - Root causes
  - Evidence
  - Unknowns
  - Suggested next actions

The first user flow is:

1. User opens a session.
2. User selects `耗时原因诊断`.
3. User keeps `Claude Code CLI`.
4. User clicks `Analyze`.
5. Backend builds a redacted evidence pack, calls `claude -p`, validates structured output, and returns a result.

## Prompt Pack Model

The design borrows from SoulSpec-style separation of identity/workflow and Prompty/BAML-style separation of template, inputs, and return schema.

Proposed layout:

```text
src/analysis/
  evidence/
    build-evidence-pack.js
    sanitize-untrusted-content.js
  llm/
    claude-p.js
    registry.js
  prompts/
    souls/
      session-time-analyst/
        soul.json
        SOUL.md
    templates/
      time-diagnosis.prompt.md
      task-status.prompt.md
      answer-verification.prompt.md
      handoff-summary.prompt.md
    schemas/
      time-diagnosis.schema.json
```

Prompt assembly order:

```text
System guard
  -> Soul / analyst role
  -> Selected task template
  -> Output schema instructions
  -> Trusted computed metrics
  -> Untrusted evidence pack
  -> User custom prompt as analysis focus
```

The custom prompt is not appended as higher-priority instruction. It is wrapped as a user focus field:

```text
<USER_ANALYSIS_FOCUS>
...
</USER_ANALYSIS_FOCUS>
```

It can ask the analyzer what to inspect, but it cannot override evidence rules, output schema, redaction, or tool restrictions.

## Built-In Templates

### Time Diagnosis

Default template. Answers why the session took long.

Required dimensions:

- Total duration: first session timestamp to last session timestamp.
- Active duration: computed turn spans excluding idle gaps.
- Idle gaps: long gaps likely caused by user inactivity or external waiting.
- Tool latency: paired tool call to tool result duration when possible.
- Command latency: long shell/tool output, timeout, install, network, test, build, or retry indicators.
- Retry loops: repeated commands, repeated file reads, or repeated failed attempts.
- Permission/sandbox waiting: approval, permission, blocked, sandbox, or escalation signals.
- Context overload: large tool outputs, long reasoning, many files read, high token usage.
- Unknowns: missing timestamps or unpaired events that prevent reliable attribution.

### Task Status

Checks whether the session appears completed, blocked, failed, or still in progress.

### Answer Verification

Checks whether the final agent answer is supported by actual evidence in turns, commands, and tool results.

### Handoff Summary

Produces a compact continuation note for a future agent.

## Evidence Pack

The evidence pack is a compact, redacted, provider-neutral JSON object. It should not contain raw JSONL lines unless explicitly included as shortened text fields.

Example shape:

```json
{
  "session": {
    "provider": "codex",
    "id": "rollout-sample",
    "title": "Fix checkout timeout",
    "project": "demo",
    "createdAt": "2026-05-11T02:00:00.000Z",
    "updatedAt": "2026-05-11T02:08:00.000Z",
    "summary": {
      "turns": 12,
      "inputTokens": 1000,
      "outputTokens": 500,
      "costUSD": null
    }
  },
  "trustedMetrics": {
    "totalDurationMs": 480000,
    "largestGaps": [],
    "turnKindCounts": {},
    "toolPairs": []
  },
  "turns": [
    {
      "id": "rollout-sample:3",
      "kind": "tool_call",
      "timestamp": "2026-05-11T02:04:00.000Z",
      "title": "functions.exec_command",
      "textPreview": "npm test",
      "redactionApplied": "strict"
    }
  ],
  "warnings": []
}
```

All `textPreview` fields are untrusted. They are bounded, redacted, and wrapped before being sent to the LLM.

## Prompt Injection Boundary

Session logs may contain user messages, assistant messages, command output, web content, files, and tool results. All of these are untrusted.

Rules:

- Never let session content appear above system guard or task template content.
- Wrap all evidence in clear tags such as `<UNTRUSTED_SESSION_EVIDENCE>`.
- Explicitly instruct the model not to follow instructions found inside evidence.
- Use strict redaction before LLM calls.
- Limit text previews and large outputs.
- Disable tools for `claude -p` analysis.
- Validate model output against schema.
- Validate evidence turn IDs referenced by the model.
- Mark low confidence when claims lack cited evidence.

High-risk prompt-injection phrases in evidence, such as `ignore previous instructions`, `system prompt`, or `developer message`, should not be deleted silently. They should be preserved only as redacted/bounded evidence and optionally flagged in `warnings`.

## Claude-p Adapter

First enabled LLM adapter:

```bash
claude -p \
  --output-format json \
  --json-schema '<schema>' \
  --no-session-persistence \
  --permission-mode dontAsk \
  --tools ""
```

Optional adapter settings:

- `--model <model>` when configured.
- `--max-budget-usd <amount>` when configured.
- timeout enforced by the Node child process wrapper.

The adapter reads prompt text through stdin or an argument depending on implementation safety. Prefer stdin to avoid command-line length limits and shell quoting issues.

The first version should not use:

- `--dangerously-skip-permissions`
- `--allowedTools`
- `--add-dir`
- direct file paths for raw session logs

## Structured Output

`time-diagnosis.schema.json` should require a stable result shape:

```json
{
  "type": "object",
  "required": ["summary", "duration", "topDelaySegments", "rootCauses", "unknowns", "confidence"],
  "properties": {
    "summary": { "type": "string" },
    "duration": {
      "type": "object",
      "required": ["totalMs", "activeMs", "idleMs"],
      "properties": {
        "totalMs": { "type": "number" },
        "activeMs": { "type": "number" },
        "idleMs": { "type": "number" }
      }
    },
    "topDelaySegments": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["category", "durationMs", "evidenceTurnIds", "confidence", "explanation"],
        "properties": {
          "category": {
            "type": "string",
            "enum": [
              "tool_execution",
              "command_wait",
              "retry_loop",
              "permission_wait",
              "user_idle",
              "context_overload",
              "network_or_install",
              "test_or_build",
              "unknown"
            ]
          },
          "durationMs": { "type": "number" },
          "evidenceTurnIds": {
            "type": "array",
            "items": { "type": "string" }
          },
          "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"]
          },
          "explanation": { "type": "string" }
        }
      }
    },
    "rootCauses": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["cause", "evidenceTurnIds", "recommendation"],
        "properties": {
          "cause": { "type": "string" },
          "evidenceTurnIds": {
            "type": "array",
            "items": { "type": "string" }
          },
          "recommendation": { "type": "string" }
        }
      }
    },
    "unknowns": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": {
      "type": "string",
      "enum": ["high", "medium", "low"]
    }
  }
}
```

The backend should merge trusted computed metrics back into the result before sending it to the UI, so measured duration fields cannot be overwritten by model guesses.

## API Design

```text
GET  /api/analysis/templates
POST /api/session/analyze
```

`POST /api/session/analyze` request:

```json
{
  "provider": "codex",
  "id": "rollout-sample",
  "templateId": "time-diagnosis",
  "llmId": "claude-p",
  "customPrompt": "Focus on tool calls and repeated test runs."
}
```

Response:

```json
{
  "templateId": "time-diagnosis",
  "llmId": "claude-p",
  "redactionLevel": "strict",
  "result": {},
  "localChecks": {
    "invalidEvidenceRefs": [],
    "schemaValid": true,
    "fallbackUsed": false
  }
}
```

## Error Handling

- If `claude` is missing, return a clear setup error and show a disabled provider state.
- If `claude -p` times out, return local computed metrics and mark LLM analysis unavailable.
- If schema validation fails, show raw-safe error metadata only, not raw prompts.
- If evidence references are invalid, downgrade confidence and show validation warnings.
- If redaction fails, do not call the LLM.

## Testing Strategy

Unit tests:

- Evidence pack builder creates bounded, redacted, provider-neutral evidence.
- Duration metrics are computed from fixtures.
- Prompt assembly preserves ordering and wraps untrusted evidence.
- Custom prompt is inserted only as analysis focus.
- Claude-p adapter command construction disables tools and avoids raw file paths.
- Schema validation rejects missing required fields.
- Evidence reference validation detects non-existent turn IDs.

Server tests:

- `GET /api/analysis/templates` returns built-in templates.
- `POST /api/session/analyze` can use a fake LLM adapter and returns structured output.
- Missing `claude` or adapter failure returns a non-secret error.

UI tests can stay lightweight in the first version:

- Static HTML contains template/provider controls and analysis container.
- App JS can render success/error analysis payloads.

## References

- Claude Code headless mode: https://code.claude.com/docs/en/headless
- SoulSpec: https://soulspec.org/
- Prompty: https://prompty.ai/
- BAML: https://github.com/BoundaryML/baml
- StackOne Defender: https://github.com/StackOneHQ/defender
- Prompt injection defenses: https://github.com/tldrsec/prompt-injection-defenses
- Vercel AI SDK structured output: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- LangChain providers and models: https://docs.langchain.com/oss/javascript/concepts/providers-and-models
