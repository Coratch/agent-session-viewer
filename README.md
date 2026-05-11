# agent-session-viewer

Local Web UI for browsing AI coding assistant session logs.

The first release supports:

- Claude Code sessions from `~/.claude/projects/**/*.jsonl`
- Codex sessions from `~/.codex/sessions/**/*.jsonl`
- Session summaries with provider, project, title, model, token, and estimated cost metadata
- Turn-level browsing for user, assistant, reasoning, tool call, tool result, event, and attachment records

The tool is local-only. It reads files from your machine and does not send telemetry or make external network requests.

## Install

```bash
npm install -g agent-session-viewer
agent-session-viewer
```

From a checkout:

```bash
npm install
npm start
```

## CLI

```bash
agent-session-viewer
agent-session-viewer --port 5000
agent-session-viewer --host 127.0.0.1
agent-session-viewer --provider claude-code,codex
agent-session-viewer --claude-dir ~/.claude/projects
agent-session-viewer --codex-dir ~/.codex/sessions
```

The server binds to `127.0.0.1:4500` by default. Binding to `0.0.0.0` can expose private prompts, tool output, repository paths, and command output. Use a trusted reverse proxy and authentication before exposing it to a network.

## Development

```bash
npm test
node --check src/server.js
```

The frontend is intentionally static HTML/CSS/JS in the first phase. Provider-specific parsing lives under `src/providers/`, and both providers normalize into common `Session` and `Turn` objects before the API returns data to the browser.
