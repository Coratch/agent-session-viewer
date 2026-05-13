# Basic Rules

1. Do not write sensitive information anywhere in this project, including API keys, tokens, passwords, private keys, credentials, personal identifiers, or production secrets. Use environment variables, ignored local files, or documented placeholders instead.
2. At the end of each conversation turn, read the Obsidian project notes for `agent-session-viewer`, provide the recommended next execution actions, and ask the user whether the plan should be adjusted. If the user says no adjustment is needed, proceed with execution.
