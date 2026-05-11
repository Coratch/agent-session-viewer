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

Generate a local recap from the same packaged fixtures:

```bash
npx @coratch/agent-session-viewer@latest recap --demo
```

The recap command uses local rules rather than an external LLM, so it can run without API keys or network calls beyond the package install.

```markdown
# Pick Up Where I Left Off

## Summary
Found 2 sessions across 2 active projects from claude-code, codex.

## Active Projects
- agent-session-viewer
- demo-app

## Completed
- Demo inspection complete
- npm test -- checkout-timeout

## Next Actions
1. Review recent work and choose the next roadmap item.
```

The same recap is available in the Web UI through the sidebar Recap control:

![Demo recap](assets/demo-recap.png)

## Session List

![Demo session list](assets/demo-session-list.png)

The left rail shows Claude Code and Codex sessions side by side, including provider, title, project, turn count, token context, cost, and update time.

## Turn Detail

![Demo turn detail](assets/demo-turn-detail.png)

Selecting a session expands provider-neutral metadata and normalized turns, so user prompts, assistant messages, reasoning summaries, events, and attachments can be read in one place.

## Tool Calls And Reasoning

![Demo tool calls and reasoning](assets/demo-tool-call.png)

The Codex fixture includes reasoning summaries, tool calls, tool results, and task events. Encrypted reasoning payloads are not rendered; only available summaries are shown.
