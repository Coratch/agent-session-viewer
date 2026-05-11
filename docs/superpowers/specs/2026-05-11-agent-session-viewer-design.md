# Agent Session Viewer Design

## Goal

Build `agent-session-viewer` as a globally installable npm CLI that starts a local Web UI for browsing local AI coding assistant sessions. The first release will preserve the lightweight `cc-mini-viewer` style while generalizing it beyond Claude Code.

The tool must support:

- Claude Code sessions from `~/.claude/projects/**/*.jsonl`
- Codex sessions from `~/.codex/sessions/**/*.jsonl`
- Session list browsing with provider, project, title, time, model, token, and cost metadata
- Session detail browsing with turn-level user, assistant, reasoning, tool call, tool result, event, and attachment content

The first phase explicitly does not introduce React, Vite, a database, authentication, remote telemetry, or hosted services.

## Product Shape

The package name and command are both `agent-session-viewer`.

```bash
npm install -g agent-session-viewer
agent-session-viewer
agent-session-viewer --port 5000
agent-session-viewer --host 127.0.0.1
agent-session-viewer --provider claude-code,codex
agent-session-viewer --claude-dir ~/.claude/projects
agent-session-viewer --codex-dir ~/.codex/sessions
```

The CLI starts an HTTP server bound to `127.0.0.1` by default and prints the local URL. Binding to `0.0.0.0` remains possible but should be documented as unsafe without external authentication because session files can contain private prompts, tool output, repository paths, and command output.

## Architecture

The first implementation will keep a Node.js backend and static vanilla frontend.

```text
agent-session-viewer/
  bin/
    agent-session-viewer.js
  src/
    cli.js
    config.js
    server.js
    registry.js
    model/
      normalize.js
      pricing.js
    providers/
      claude-code.js
      codex.js
    utils/
      files.js
      process.js
      security.js
  public/
    index.html
    style.css
    app.js
```

`bin/agent-session-viewer.js` is only the executable shim. `src/cli.js` parses options and starts `src/server.js`. `src/registry.js` owns provider registration and combines provider results. Each provider owns filesystem discovery, JSONL parsing, summary caching, and raw-file access for its own source.

The frontend continues to fetch JSON from the local server and render with DOM APIs. It will receive provider-neutral `Session` and `Turn` objects so the UI does not need to know the raw Claude or Codex JSONL schema.

## Data Model

Providers normalize their raw logs into this common shape:

```js
Session {
  id,
  provider,
  project,
  title,
  file,
  createdAt,
  updatedAt,
  model,
  cwd,
  summary: {
    turns,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    costUSD
  },
  meta
}

Turn {
  id,
  provider,
  kind,
  timestamp,
  title,
  text,
  raw,
  usage,
  costUSD
}
```

Allowed `Turn.kind` values in the first phase are `user`, `assistant`, `reasoning`, `tool_call`, `tool_result`, `event`, and `attachment`.

## Claude Code Provider

The Claude Code provider is based on the existing `cc-mini-viewer` parser. It scans project directories under `~/.claude/projects`, reads `.jsonl` files, summarizes assistant usage, estimates cost from model pricing, extracts the first user prompt as a title, and renders user, assistant, and attachment rows.

It should preserve the useful live-process behavior from `cc-mini-viewer`: while a Claude process is still alive, use `ps` output to map `--session-id` to a process and recover the current command line. Parent-child session relations can stay Claude-specific metadata in the first phase.

## Codex Provider

The Codex provider scans `~/.codex/sessions/YYYY/MM/DD/*.jsonl`. It maps known event shapes into the common model:

- `session_meta` provides session id, cwd, CLI version, model provider, and git metadata.
- `turn_context` provides model, sandbox, permission, collaboration mode, effort, and date/time context.
- `event_msg:user_message` maps to a `user` turn.
- `event_msg:agent_message` and `response_item:message` map to `assistant` turns.
- `response_item:reasoning` maps to a `reasoning` turn using available summaries/content. Encrypted reasoning content is not decrypted or represented as hidden chain of thought.
- `response_item:function_call` maps to `tool_call`.
- `response_item:function_call_output` maps to `tool_result`.
- `event_msg:token_count`, `task_started`, `task_complete`, web search events, and MCP tool events map to `event` turns or summary metadata.

Codex cost calculation is optional in the first release. If reliable usage and pricing fields are unavailable, the UI should display token counts where available and leave cost blank instead of guessing.

## API

The server exposes provider-neutral APIs:

```text
GET /api/providers
GET /api/sessions?provider=all|claude-code|codex
GET /api/session?provider=<provider>&id=<session-id>
```

The API should not accept arbitrary absolute file paths. The current `cc-mini-viewer` style `file=<absolute path>` parameter will be replaced with `provider + id`; providers resolve ids to files internally from their own scanned indexes. This avoids weak path prefix checks and reduces local path exposure in URLs and logs.

Responses must use `Cache-Control: no-store` because the content can include private local data.

## Frontend

The first frontend remains the current lightweight static UI:

- Sidebar session list
- Provider badge and provider filter
- Search across project, title, provider, model, and session id
- Detail pane with session metadata, totals, command/context info, and turn cards
- Distinct card styles for user, assistant, reasoning, tool call, tool result, event, and attachment
- Long turn bodies collapsed by default with an expand button

The UI should avoid rendering raw HTML from session content. Text bodies should be inserted with `textContent`; small generated markup may use escaped strings.

## Security And Privacy

The tool is local-first and reads private local logs. Default host is `127.0.0.1`. The project will document that binding to a public interface is unsafe unless the user adds a trusted reverse proxy and authentication.

The server must:

- Resolve files through provider indexes, not arbitrary request paths
- Avoid path traversal by using normalized paths and provider roots
- Avoid logging full absolute file paths in query strings where possible
- Never send telemetry or network requests
- Avoid exposing raw encrypted reasoning as meaningful text

## Testing

The first implementation should include small parser fixtures for both providers.

Minimum tests:

- Claude usage and cost summary parsing
- Claude message block rendering into text
- Codex event mapping for user, assistant, reasoning, tool call, tool result, and event rows
- Provider id-to-file resolution rejects unknown ids
- API route returns normalized sessions without accepting arbitrary file paths

The initial smoke check is:

```bash
npm test
npm start
```

Then manually open the printed local URL and verify both Claude Code and Codex sessions appear when the corresponding local directories exist.

## Scope Boundaries

First phase includes global npm CLI packaging, provider abstraction, Claude Code support, Codex support, provider-neutral APIs, and the adapted static frontend.

First phase excludes React/Vite migration, full-text indexing, SQLite, hosted sync, auth, session editing, transcript export, and exact Codex billing calculation unless reliable usage data is present in local logs.
