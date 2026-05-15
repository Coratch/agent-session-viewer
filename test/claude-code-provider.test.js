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

  assert.equal(turns.map((t) => t.kind).join(','), 'user,reasoning,assistant,tool_call,hook,tool_result');
  assert.equal(turns[0].text, 'inspect repository');
  assert.equal(turns[1].title, 'reasoning');
  assert.match(turns[1].text, /inspect package metadata/);
  assert.equal(turns[2].title, 'assistant');
  assert.equal(turns[2].text, 'Repository inspected.');
  assert.equal(turns[2].usage.inputTokens, 100);
  assert.equal(turns[3].title, 'Read');
  assert.match(turns[3].text, /"file_path": "package\.json"/);
  assert.equal(turns[3].meta.toolUseId, 'toolu_read_1');
  assert.equal(turns[4].title, 'PostToolUse');
  assert.equal(turns[4].kind, 'hook');
  assert.equal(turns[4].text, 'hook output');
  assert.equal(turns[5].title, 'toolu_read_1');
  assert.equal(turns[5].text, 'package metadata loaded');
  assert.throws(() => provider.readSession('missing'), /Unknown session/);
});
