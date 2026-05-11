# Demo

Use demo mode when you want to try the viewer without local Claude Code or Codex logs:

```bash
npx @coratch/agent-session-viewer@latest --demo
```

For a local checkout:

```bash
npm start -- --demo
```

Demo mode reads sanitized fixtures from `examples/fixtures/` and opens the same local Web UI used for real session logs.

## Session List

![Demo session list](assets/demo-session-list.png)

The left rail shows Claude Code and Codex sessions side by side, including provider, title, project, turn count, token context, cost, and update time.

## Turn Detail

![Demo turn detail](assets/demo-turn-detail.png)

Selecting a session expands provider-neutral metadata and normalized turns, so user prompts, assistant messages, reasoning summaries, events, and attachments can be read in one place.

## Tool Calls And Reasoning

![Demo tool calls and reasoning](assets/demo-tool-call.png)

The Codex fixture includes reasoning summaries, tool calls, tool results, and task events. Encrypted reasoning payloads are not rendered; only available summaries are shown.
