# RunWhy

Local flight recorder, replay, recap, and time diagnosis for AI coding agents.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-339933)
![Local first](https://img.shields.io/badge/privacy-local--first-0f766e)
![No telemetry](https://img.shields.io/badge/telemetry-none-475569)

`ccusage` tells you how much you spent. RunWhy tells you why an agent run slowed down, where it got stuck, and which turn proves it.

RunWhy reads local Claude Code and Codex JSONL logs directly, then turns them into a local Web UI for replay, recap, and evidence-backed time diagnosis. The `recap` command generates a local Markdown work summary without calling an external LLM. The Web UI can also run an optional single-session diagnosis through your local Claude CLI.

![RunWhy preview](docs/assets/runwhy-preview.svg)

Open the [RunWhy site](https://coratch.github.io/agent-session-viewer/) for a product overview and static example. See the [demo walkthrough](docs/demo.md) for screenshots using sanitized Claude Code and Codex fixtures. See the [issue and PR recap example](docs/issue-pr-recap-example.md) for a shareable workflow.

## Why RunWhy

AI coding assistants leave useful local traces, but raw JSONL files are hard to read when you need to answer practical questions:

- What did I ask Claude Code or Codex yesterday?
- Which tool call changed this file?
- What command output led the agent to that answer?
- Where did this error first appear across old sessions?
- What did I work on before the weekend, and where should I restart?
- What should I export into a bug report, PR, or postmortem?

This project focuses on local session replay, turn inspection, recap, and time diagnosis. Cost and token numbers are useful context, but they are not the primary product. The core question is simple: why did this run take so long?

## Install

The primary npm package is `runwhy`. The old `agent-session-viewer` CLI remains as a compatibility alias inside the package.

```bash
npm install -g runwhy
runwhy
```

Try without installing globally:

```bash
npx runwhy@latest
```

Try the packaged Web UI demo without local logs:

```bash
npx runwhy@latest --demo
```

Try the packaged recap demo:

```bash
npx runwhy@latest recap --demo
```

Install from GitHub when testing unreleased changes:

```bash
npm install -g github:Coratch/agent-session-viewer
```

## What It Reads

```text
~/.claude/projects/**/*.jsonl
~/.codex/sessions/**/*.jsonl
```

The server binds to `127.0.0.1:4500` by default. It does not proxy model traffic, require API keys, upload logs, or send telemetry.

## Features

- Browse Claude Code and Codex sessions in one UI
- Inspect turn-level `user`, `assistant`, `reasoning`, `tool_call`, `tool_result`, `event`, and `attachment` records
- See provider, project, title, model, cwd, token, and estimated Claude cost metadata
- Filter sessions by provider and keyword
- Generate a local Markdown recap of recent work with default redaction
- Analyze one session for time cost, delay segments, root causes, confidence, and evidence turns
- Save analysis reports locally and copy them as Markdown
- Use a RunWhy layout with top-level source refresh, session navigation, diagnosis workspace, and right-side inspector
- Keep private logs local by default
- Run as a zero-dependency Node.js CLI

![session replay flow](docs/assets/session-replay-demo.svg)

## CLI

```bash
runwhy
runwhy --port 5000
runwhy --host 127.0.0.1
runwhy --provider claude-code,codex
runwhy --claude-dir ~/.claude/projects
runwhy --codex-dir ~/.codex/sessions
runwhy --demo
```

Generate a local work recap:

```bash
runwhy recap
runwhy recap --days 7
runwhy recap --since 2026-05-01
runwhy recap --project runwhy
runwhy recap --provider claude-code,codex
runwhy recap --redaction strict
runwhy recap --out recap.md
runwhy recap --demo
```

Recap output is generated with local rules, not an external LLM. It includes active projects, completed items, open threads, commands/files, key decisions, and next actions. Basic redaction is enabled by default for home paths and common token/header shapes.

Export one session as Markdown:

```bash
runwhy export --provider codex --id rollout-demo --format markdown --out session.md
runwhy export --provider claude-code --id session-claude-demo --redaction strict --demo
```

Use `--redaction strict` before sharing recap or export output in an issue, PR, or postmortem. Strict mode also hides broader identifiers such as emails, IP addresses, absolute paths, cloud key shapes, and username-like values. Use `--redaction none` only for private local inspection.

Binding to `0.0.0.0` can expose private prompts, tool output, repository paths, and command output. Use a trusted reverse proxy and authentication before exposing it to a network.

## Experimental LLM Diagnosis

The Web UI includes a first-pass single-session analysis flow focused on why an agent run took time. It prepares a redacted evidence pack, computes trusted local timing metrics, and can call the local Claude CLI in headless mode through `claude -p`.

The report separates local metrics from LLM-inferred diagnosis, then renders a primary cause, delay timeline, confidence, and evidence buttons that jump back to the original turns. Reports are stored in browser local storage and can be copied as Markdown.

This feature requires a working local Claude CLI. It does not require storing API keys in this project.

## Comparison

| Tool | Primary focus | Claude Code | Codex | Local session replay | Export focus | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| RunWhy (`runwhy`) | Local flight recorder, replay, recap, and time diagnosis | Yes | Yes | Yes | Recap, diagnosis, and Markdown export | Lightweight zero-dependency CLI plus optional local Claude CLI diagnosis |
| `claude-code-log` | Claude Code log reading and export | Yes | No | Yes | Yes | Strong Markdown/HTML export workflow for Claude Code logs |
| `sniffly` | Claude Code observability dashboard | Yes | No | Yes | Partial | Strong local-first privacy positioning and usage analytics |
| `claude-code-viewer` | Claude Code Web/PWA workflows | Yes | No | Yes | Partial | Larger Claude Code-oriented viewer with project and session workflows |
| `cxresume` | Codex resume helper | No | Yes | Partial | No | Focused on finding and resuming Codex sessions |
| `ccusage` | Token and cost reports | Yes | No | No | Reports | Best for cost and token accounting, not conversation replay |

## Roadmap

- JSON export
- Global search across all sessions
- In-session search and jump-to-turn
- Server-sent analysis progress from the LLM adapter
- Shareable analysis report links
- Better structured display for shell commands, MCP calls, and web searches

## Development

```bash
npm test
npm run check
npm run pack:check
npm start
```

The frontend is static HTML/CSS/JS in the first phase. Provider-specific parsing lives under `src/providers/`, and both providers normalize into common `Session` and `Turn` objects before the API returns data to the browser.
