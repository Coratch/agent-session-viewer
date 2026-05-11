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
