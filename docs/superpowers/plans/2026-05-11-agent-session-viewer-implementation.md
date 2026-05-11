# Agent Session Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first npm-installable `agent-session-viewer` CLI with Claude Code and Codex local session browsing.

**Architecture:** Keep the first release lightweight: Node.js built-ins for the CLI, HTTP server, provider registry, providers, and tests; static vanilla HTML/CSS/JS for the UI. Providers normalize raw Claude Code and Codex JSONL files into shared `Session` and `Turn` objects so the frontend and API stay provider-neutral.

**Tech Stack:** Node.js >= 18, CommonJS modules, Node's built-in `node:test`, built-in `http`, `fs`, `path`, `os`, and `child_process`; static browser JavaScript.

---

### Task 1: Project Skeleton And Test Runner

**Files:**
- Create: `package.json`
- Create: `bin/agent-session-viewer.js`
- Create: `src/cli.js`
- Create: `src/config.js`
- Create: `test/config.test.js`

- [ ] **Step 1: Write the failing config test**

Create `test/config.test.js`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');
const os = require('node:os');
const path = require('node:path');

const { parseArgs } = require('../src/config');

test('parseArgs returns defaults for local viewer startup', () => {
  const cfg = parseArgs([]);

  assert.equal(cfg.host, '127.0.0.1');
  assert.equal(cfg.port, 4500);
  assert.deepEqual(cfg.providers, ['claude-code', 'codex']);
  assert.equal(cfg.claudeDir, path.join(os.homedir(), '.claude', 'projects'));
  assert.equal(cfg.codexDir, path.join(os.homedir(), '.codex', 'sessions'));
});

test('parseArgs accepts port, host, provider, and custom roots', () => {
  const cfg = parseArgs([
    '--port', '5001',
    '--host', '0.0.0.0',
    '--provider', 'codex',
    '--claude-dir', '/tmp/claude',
    '--codex-dir', '/tmp/codex',
  ]);

  assert.equal(cfg.port, 5001);
  assert.equal(cfg.host, '0.0.0.0');
  assert.deepEqual(cfg.providers, ['codex']);
  assert.equal(cfg.claudeDir, '/tmp/claude');
  assert.equal(cfg.codexDir, '/tmp/codex');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/config.test.js`

Expected: FAIL because `package.json` or `src/config.js` does not exist yet.

- [ ] **Step 3: Add package and config implementation**

Create `package.json` with `bin.agent-session-viewer`, `start`, `test`, and Node >= 18 metadata. Create `src/config.js` with `parseArgs(argv)` supporting `--port`, `--host`, `--provider`, `--claude-dir`, `--codex-dir`, and positional port compatibility. Create `src/cli.js` and `bin/agent-session-viewer.js` as thin startup shims.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/config.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json bin/agent-session-viewer.js src/cli.js src/config.js test/config.test.js
git commit -m "feat: add npm cli skeleton"
```

### Task 2: Shared Model And Pricing

**Files:**
- Create: `src/model/normalize.js`
- Create: `src/model/pricing.js`
- Create: `test/pricing.test.js`

- [ ] **Step 1: Write failing pricing tests**

Create `test/pricing.test.js`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { costFromUsage, messageBlocksToText } = require('../src/model/pricing');

test('costFromUsage prices sonnet usage with cache buckets', () => {
  const cost = costFromUsage('claude-sonnet-4-5-20251001', {
    input_tokens: 1000,
    output_tokens: 2000,
    cache_read_input_tokens: 3000,
    cache_creation_input_tokens: 7000,
    cache_creation: {
      ephemeral_5m_input_tokens: 4000,
      ephemeral_1h_input_tokens: 3000,
    },
  });

  assert.equal(cost, 0.0549);
});

test('messageBlocksToText renders text, thinking, tool use, and tool result blocks', () => {
  const text = messageBlocksToText([
    { type: 'text', text: 'hello' },
    { type: 'thinking', thinking: 'short summary' },
    { type: 'tool_use', name: 'Read', input: { file_path: '/tmp/a.txt' } },
    { type: 'tool_result', content: [{ type: 'text', text: 'ok' }] },
  ]);

  assert.match(text, /hello/);
  assert.match(text, /\[thinking\] short summary/);
  assert.match(text, /\[tool_use:Read\]/);
  assert.match(text, /\[tool_result\] ok/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/pricing.test.js`

Expected: FAIL because `src/model/pricing.js` does not exist.

- [ ] **Step 3: Implement pricing and message text helpers**

Implement the Claude pricing table, `priceFor(model)`, `costFromUsage(model, usage)`, `blockToText(block)`, and `messageBlocksToText(content)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/pricing.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model/normalize.js src/model/pricing.js test/pricing.test.js
git commit -m "feat: add shared pricing helpers"
```

### Task 3: Claude Code Provider

**Files:**
- Create: `src/providers/claude-code.js`
- Create: `test/fixtures/claude/projects/sample-project/session-claude.jsonl`
- Create: `test/claude-code-provider.test.js`

- [ ] **Step 1: Write failing Claude provider tests**

Create a fixture with one user line, one assistant line with usage, one attachment line, and metadata fields. Create tests that instantiate the provider against `test/fixtures/claude/projects`, call `listSessions()`, then call `readSession(id)`.

Expected assertions:

```js
assert.equal(session.provider, 'claude-code');
assert.equal(session.project, 'sample-project');
assert.equal(session.title, 'inspect repository');
assert.equal(session.summary.turns, 1);
assert.equal(turns.map(t => t.kind).join(','), 'user,assistant,attachment');
assert.rejects(() => provider.readSession('missing'), /Unknown session/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/claude-code-provider.test.js`

Expected: FAIL because `src/providers/claude-code.js` does not exist.

- [ ] **Step 3: Implement Claude provider**

Implement `createClaudeCodeProvider({ rootDir })` returning `{ id, label, rootDir, listSessions, readSession }`. Reuse the parser behavior from `cc-mini-viewer`: scan one directory level of projects, parse `.jsonl`, summarize usage, derive title from first non-meta user message, and return normalized turns.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/claude-code-provider.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/claude-code.js test/fixtures/claude test/claude-code-provider.test.js
git commit -m "feat: add claude code provider"
```

### Task 4: Codex Provider

**Files:**
- Create: `src/providers/codex.js`
- Create: `test/fixtures/codex/sessions/2026/05/11/rollout-sample.jsonl`
- Create: `test/codex-provider.test.js`

- [ ] **Step 1: Write failing Codex provider tests**

Create a fixture with `session_meta`, `turn_context`, `event_msg:user_message`, `response_item:message`, `response_item:reasoning`, `response_item:function_call`, `response_item:function_call_output`, and `event_msg:task_complete` lines.

Expected assertions:

```js
assert.equal(session.provider, 'codex');
assert.equal(session.model, 'gpt-5.2');
assert.equal(session.cwd, '/tmp/repo');
assert.equal(session.title, 'build viewer');
assert.deepEqual(turns.map(t => t.kind), [
  'user',
  'assistant',
  'reasoning',
  'tool_call',
  'tool_result',
  'event',
]);
assert.equal(turns.find(t => t.kind === 'reasoning').text, 'checked files');
assert.doesNotMatch(turns.find(t => t.kind === 'reasoning').text, /encrypted/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/codex-provider.test.js`

Expected: FAIL because `src/providers/codex.js` does not exist.

- [ ] **Step 3: Implement Codex provider**

Implement recursive `.jsonl` discovery under `~/.codex/sessions`, parse known Codex event shapes, derive title from the first `user_message`, use filename as fallback id, and leave cost null when reliable usage is absent.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/codex-provider.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/providers/codex.js test/fixtures/codex test/codex-provider.test.js
git commit -m "feat: add codex provider"
```

### Task 5: Provider Registry And HTTP API

**Files:**
- Create: `src/registry.js`
- Create: `src/server.js`
- Create: `src/utils/files.js`
- Create: `src/utils/process.js`
- Create: `src/utils/security.js`
- Create: `test/server.test.js`

- [ ] **Step 1: Write failing API tests**

Create `test/server.test.js` that starts the server on port `0` with fixture roots and fetches:

```js
const providers = await json('/api/providers');
assert.deepEqual(providers.providers.map(p => p.id), ['claude-code', 'codex']);

const sessions = await json('/api/sessions');
assert.equal(sessions.sessions.length, 2);
assert.ok(sessions.sessions.every(s => !s.file));

const detail = await json('/api/session?provider=codex&id=rollout-sample');
assert.equal(detail.session.provider, 'codex');
assert.ok(detail.turns.length > 0);

const bad = await fetch(base + '/api/session?provider=codex&id=/etc/passwd');
assert.equal(bad.status, 404);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/server.test.js`

Expected: FAIL because `src/server.js` and `src/registry.js` do not exist.

- [ ] **Step 3: Implement registry and server**

Implement `createRegistry(providers)`, `createServer(config)`, static asset serving, `/api/providers`, `/api/sessions`, `/api/session`, no-store JSON responses, and provider/id lookup without accepting arbitrary file paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/server.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/registry.js src/server.js src/utils test/server.test.js
git commit -m "feat: add provider api server"
```

### Task 6: Static Web UI And Documentation

**Files:**
- Create: `public/index.html`
- Create: `public/style.css`
- Create: `public/app.js`
- Create: `README.md`
- Modify: `src/cli.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing smoke test**

Extend `test/server.test.js` with:

```js
const html = await fetch(base + '/').then(r => r.text());
assert.match(html, /agent-session-viewer/);

const app = await fetch(base + '/app.js');
assert.equal(app.status, 200);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/server.test.js`

Expected: FAIL because `public/index.html` and `public/app.js` do not exist.

- [ ] **Step 3: Add static frontend and README**

Adapt the `cc-mini-viewer` vanilla UI to use provider-neutral fields. Add provider badges, provider filter, `/api/sessions?provider=...`, `/api/session?provider=...&id=...`, and turn styles for `reasoning`, `tool_call`, `tool_result`, and `event`.

- [ ] **Step 4: Run all tests**

Run: `npm test`

Expected: PASS for all tests.

- [ ] **Step 5: Manual smoke check**

Run: `npm start -- --port 0` or `node src/cli.js --port 4500`, open the printed local URL, and verify the UI loads.

- [ ] **Step 6: Commit**

```bash
git add public README.md src/cli.js package.json test/server.test.js
git commit -m "feat: add static session viewer ui"
```

### Task 7: Final Verification

**Files:**
- Modify only if verification exposes a bug.

- [ ] **Step 1: Run complete test suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Run syntax checks**

Run: `node --check bin/agent-session-viewer.js && node --check src/cli.js && node --check src/server.js && node --check public/app.js`

Expected: all commands exit 0.

- [ ] **Step 3: Check git status**

Run: `git status --short`

Expected: only user-owned `.idea/` may remain untracked, unless the user chooses to add it to `.gitignore`.
