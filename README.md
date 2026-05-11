# agent-session-viewer

Local session replay and inspection viewer for Claude Code and Codex.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-339933)
![Local first](https://img.shields.io/badge/privacy-local--first-0f766e)
![No telemetry](https://img.shields.io/badge/telemetry-none-475569)

`ccusage` tells you how much you spent. `agent-session-viewer` shows what actually happened.

It reads your local JSONL logs directly, then lets you inspect user prompts, assistant replies, reasoning summaries, tool calls, tool results, events, and attachments in one local Web UI.

![agent-session-viewer preview](docs/assets/agent-session-viewer-preview.svg)

## Why

AI coding assistants leave useful local traces, but raw JSONL files are hard to read when you need to answer practical questions:

- What did I ask Claude Code or Codex yesterday?
- Which tool call changed this file?
- What command output led the agent to that answer?
- Where did this error first appear across old sessions?
- What should I export into a bug report or postmortem?

This project focuses on local session replay, turn inspection, and search. Cost and token numbers are useful context, but they are not the primary product.

## Install

The npm package is scoped because the unscoped `agent-session-viewer` package name is already occupied by another project.

Use the GitHub checkout now:

```bash
npm install -g github:Coratch/agent-session-viewer
agent-session-viewer
```

After the npm package is published under the `@coratch` scope:

```bash
npm install -g @coratch/agent-session-viewer
agent-session-viewer
```

Try without installing globally:

```bash
npx @coratch/agent-session-viewer@latest
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
- Keep private logs local by default
- Run as a zero-dependency Node.js CLI

![session replay flow](docs/assets/session-replay-demo.svg)

## CLI

```bash
agent-session-viewer
agent-session-viewer --port 5000
agent-session-viewer --host 127.0.0.1
agent-session-viewer --provider claude-code,codex
agent-session-viewer --claude-dir ~/.claude/projects
agent-session-viewer --codex-dir ~/.codex/sessions
```

Binding to `0.0.0.0` can expose private prompts, tool output, repository paths, and command output. Use a trusted reverse proxy and authentication before exposing it to a network.

## Positioning

| Tool | Best for |
| --- | --- |
| `ccusage` | Token and cost reports |
| `codeburn` | Multi-tool cost dashboards |
| `claude-code-viewer` | Claude Code Web client workflows |
| `agent-session-viewer` | Local Claude Code and Codex session replay, turn inspection, and search |

## Roadmap

- Global search across all sessions
- In-session search and jump-to-turn
- Markdown and JSON export
- Secret redaction mode
- Better structured display for shell commands, MCP calls, and web searches

## Development

```bash
npm test
npm run check
npm run pack:check
npm start
```

The frontend is static HTML/CSS/JS in the first phase. Provider-specific parsing lives under `src/providers/`, and both providers normalize into common `Session` and `Turn` objects before the API returns data to the browser.
