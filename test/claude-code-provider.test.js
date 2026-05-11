const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const { createClaudeCodeProvider } = require('../src/providers/claude-code');

const rootDir = path.join(__dirname, 'fixtures', 'claude', 'projects');

test('Claude provider lists normalized session summaries', () => {
  const provider = createClaudeCodeProvider({ rootDir });
  const sessions = provider.listSessions();

  assert.equal(sessions.length, 1);
  const session = sessions[0];
  assert.equal(session.id, 'session-claude');
  assert.equal(session.provider, 'claude-code');
  assert.equal(session.project, 'sample-project');
  assert.equal(session.title, 'inspect repository');
  assert.equal(session.cwd, '/tmp/repo');
  assert.equal(session.model, 'claude-sonnet-4-5-20251001');
  assert.equal(session.summary.turns, 1);
  assert.equal(session.summary.inputTokens, 100);
  assert.equal(session.summary.outputTokens, 20);
  assert.equal(session.summary.cacheReadTokens, 10);
  assert.equal(session.summary.cacheWriteTokens, 5);
  assert.equal(session.meta.permissionMode, 'acceptEdits');
  assert.equal(session.meta.gitBranch, 'main');
});

test('Claude provider reads normalized turn content and rejects unknown ids', () => {
  const provider = createClaudeCodeProvider({ rootDir });
  const { turns } = provider.readSession('session-claude');

  assert.equal(turns.map((t) => t.kind).join(','), 'user,assistant,attachment');
  assert.equal(turns[0].text, 'inspect repository');
  assert.match(turns[1].text, /Repository inspected/);
  assert.match(turns[1].text, /\[tool_use:Read\]/);
  assert.equal(turns[2].title, 'PostToolUse');
  assert.equal(turns[2].text, 'hook output');
  assert.throws(() => provider.readSession('missing'), /Unknown session/);
});
