# Issue and PR Recap Example

This example shows how to share an agent session recap without pasting raw local logs.

## Generate a Shareable Recap

```bash
agent-session-viewer recap --days 7 --project agent-session-viewer --redaction strict --out recap.md
```

For a public demo that does not require local logs:

```bash
npx @coratch/agent-session-viewer@latest recap --demo --redaction strict
```

## Export One Evidence Session

```bash
agent-session-viewer export --provider codex --id rollout-demo --format markdown --redaction strict --out session.md
```

Use `--redaction strict` before sharing outside your machine. Strict redaction hides broader identifiers such as emails, IP addresses, absolute paths, cloud key shapes, and username-like values.

## Example Issue Body

```markdown
## Agent Work Recap

The recent agent work focused on the local recap flow for Claude Code and Codex sessions.

Completed:
- Added a local recap command that produces Markdown.
- Added default redaction for common token and header shapes.
- Verified the packaged demo recap works without local logs.

Open threads:
- Validate the recap against real weekly work.
- Add single-session Markdown export for evidence-level sharing.
- Tighten redaction for public issue and PR use.

Next actions:
1. Re-run the recap on real sessions with strict redaction.
2. Export the most relevant session as Markdown.
3. Link or paste the redacted export in this issue for review.
```

## Sharing Checklist

- Run the command with `--redaction strict`.
- Skim the Markdown before posting.
- Prefer recap excerpts for high-level context.
- Use single-session export when reviewers need command or file evidence.
- Do not paste raw JSONL logs into issues or PRs.
