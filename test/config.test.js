const assert = require('node:assert/strict');
const test = require('node:test');
const os = require('node:os');
const path = require('node:path');

const { parseArgs } = require('../src/config');

test('parseArgs returns defaults for local viewer startup', () => {
  const cfg = parseArgs([]);

  assert.equal(cfg.host, '127.0.0.1');
  assert.equal(cfg.port, 4500);
  assert.equal(cfg.ui, 'react');
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

test('parseArgs accepts React UI migration flag', () => {
  const cfg = parseArgs(['--ui', 'react']);

  assert.equal(cfg.ui, 'react');
});

test('parseArgs accepts classic UI fallback flag', () => {
  const cfg = parseArgs(['--ui', 'classic']);

  assert.equal(cfg.ui, 'classic');
});

test('parseArgs demo mode points providers at packaged examples', () => {
  for (const argv of [['--demo'], ['demo']]) {
    const cfg = parseArgs(argv);

    assert.equal(cfg.demo, true);
    assert.deepEqual(cfg.providers, ['claude-code', 'codex']);
    assert.equal(cfg.claudeDir, path.join(__dirname, '..', 'examples', 'fixtures', 'claude', 'projects'));
    assert.equal(cfg.codexDir, path.join(__dirname, '..', 'examples', 'fixtures', 'codex', 'sessions'));
  }
});

test('parseArgs accepts recap options with demo fixtures', () => {
  const cfg = parseArgs([
    'recap',
    '--demo',
    '--days', '14',
    '--since', '2026-05-01',
    '--project', 'agent-session-viewer',
    '--provider', 'codex',
    '--format', 'markdown',
    '--out', 'recap.md',
  ]);

  assert.equal(cfg.command, 'recap');
  assert.equal(cfg.demo, true);
  assert.equal(cfg.days, 14);
  assert.equal(cfg.since, '2026-05-01');
  assert.equal(cfg.project, 'agent-session-viewer');
  assert.deepEqual(cfg.providers, ['codex']);
  assert.equal(cfg.format, 'markdown');
  assert.equal(cfg.outFile, 'recap.md');
  assert.equal(cfg.claudeDir, path.join(__dirname, '..', 'examples', 'fixtures', 'claude', 'projects'));
  assert.equal(cfg.codexDir, path.join(__dirname, '..', 'examples', 'fixtures', 'codex', 'sessions'));
});

test('parseArgs accepts export options with redaction level', () => {
  const cfg = parseArgs([
    'export',
    '--demo',
    '--provider', 'codex',
    '--id', 'rollout-demo',
    '--format', 'markdown',
    '--redaction', 'strict',
    '--out', 'session.md',
  ]);

  assert.equal(cfg.command, 'export');
  assert.equal(cfg.demo, true);
  assert.deepEqual(cfg.providers, ['codex']);
  assert.equal(cfg.sessionId, 'rollout-demo');
  assert.equal(cfg.format, 'markdown');
  assert.equal(cfg.redactionLevel, 'strict');
  assert.equal(cfg.outFile, 'session.md');
  assert.equal(cfg.claudeDir, path.join(__dirname, '..', 'examples', 'fixtures', 'claude', 'projects'));
  assert.equal(cfg.codexDir, path.join(__dirname, '..', 'examples', 'fixtures', 'codex', 'sessions'));
});
