const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const { createCodexProvider } = require('../src/providers/codex');

const rootDir = path.join(__dirname, 'fixtures', 'codex', 'sessions');
const duplicateRootDir = path.join(__dirname, 'fixtures', 'codex-duplicates', 'sessions');

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
    'compacted',
  ]);
  assert.equal(turns[0].text, 'build viewer');
  assert.equal(turns.find((t) => t.kind === 'reasoning').text, 'checked files');
  assert.doesNotMatch(turns.find((t) => t.kind === 'reasoning').text, /encrypted/);
  assert.match(turns.find((t) => t.kind === 'tool_call').text, /functions.exec_command/);
  assert.match(turns.find((t) => t.kind === 'tool_result').text, /LICENSE/);
  assert.match(turns.find((t) => t.kind === 'compacted').text, /Context compacted/);
  assert.doesNotMatch(turns.find((t) => t.kind === 'compacted').text, /encrypted-summary/);
  assert.throws(() => provider.readSession('missing'), /Unknown session/);
});

test('Codex provider prefers response items over duplicate event messages', () => {
  const provider = createCodexProvider({ rootDir: duplicateRootDir });
  const { session, turns } = provider.readSession('rollout-duplicate');

  assert.equal(session.summary.turns, 1);
  assert.equal(session.title, 'fix duplicate turns');
  assert.deepEqual(turns.map((t) => [t.kind, t.title, t.text]), [
    ['user', 'user', 'fix duplicate turns'],
    ['assistant', 'assistant', 'I will inspect the duplicated log.'],
    ['reasoning', 'reasoning', 'saw duplicate UI events'],
    ['tool_call', 'exec_command', 'exec_command {"cmd":"pwd"}'],
    ['tool_result', 'call-1', '/tmp/repo\n'],
  ]);
  assert.ok(turns.every((turn) => turn.title !== 'developer'));
  assert.ok(turns.every((turn) => !turn.text.includes('AGENTS.md instructions')));
});
