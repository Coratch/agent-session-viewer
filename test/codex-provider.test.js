const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const { createCodexProvider } = require('../src/providers/codex');

const rootDir = path.join(__dirname, 'fixtures', 'codex', 'sessions');

test('Codex provider lists normalized session summaries', () => {
  const provider = createCodexProvider({ rootDir });
  const sessions = provider.listSessions();

  assert.equal(sessions.length, 1);
  const session = sessions[0];
  assert.equal(session.id, 'rollout-sample');
  assert.equal(session.provider, 'codex');
  assert.equal(session.project, 'repo');
  assert.equal(session.model, 'gpt-5.2');
  assert.equal(session.cwd, '/tmp/repo');
  assert.equal(session.title, 'build viewer');
  assert.equal(session.summary.turns, 1);
  assert.equal(session.summary.costUSD, null);
  assert.equal(session.meta.cliVersion, '1.0.0');
  assert.equal(session.meta.gitBranch, 'main');
});

test('Codex provider maps events into normalized turns and hides encrypted reasoning', () => {
  const provider = createCodexProvider({ rootDir });
  const { turns } = provider.readSession('rollout-sample');

  assert.deepEqual(turns.map((t) => t.kind), [
    'user',
    'assistant',
    'reasoning',
    'tool_call',
    'tool_result',
    'event',
  ]);
  assert.equal(turns[0].text, 'build viewer');
  assert.equal(turns.find((t) => t.kind === 'reasoning').text, 'checked files');
  assert.doesNotMatch(turns.find((t) => t.kind === 'reasoning').text, /encrypted/);
  assert.match(turns.find((t) => t.kind === 'tool_call').text, /functions.exec_command/);
  assert.match(turns.find((t) => t.kind === 'tool_result').text, /LICENSE/);
  assert.throws(() => provider.readSession('missing'), /Unknown session/);
});
