# Basic Rules

1. Do not write sensitive information anywhere in this project, including API keys, tokens, passwords, private keys, credentials, personal identifiers, or production secrets. Use environment variables, ignored local files, or documented placeholders instead.
2. At the end of each conversation turn, read the Obsidian project notes for `agent-session-viewer` and maintain a next-action loop:
   - If there are concrete improvement recommendations from the current user request, repository review, validation results, or competitor/product analysis, treat those recommendations as the primary source for the next execution plan.
   - Use the Obsidian notes as project memory and priority context, but do not let stale notes override newer evidence or explicit user direction.
   - Present the recommended next execution plan clearly, ask whether the plan should be adjusted, and proceed with execution when the user says no adjustment is needed.
   - After completing plan items, update the relevant progress state in Obsidian project notes when appropriate, then provide the next recommended actions.
   - Next recommendations may be derived from the user's latest question, newly discovered risks, competitor/product analysis, validation gaps, or the remaining Obsidian roadmap.
3. After completing code changes, start the local real RunWhy service for validation. Do not start the demo service unless the user explicitly asks for demo mode.
