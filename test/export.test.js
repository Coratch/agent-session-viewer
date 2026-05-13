const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const { parseArgs } = require('../src/config');
const { createSessionExport, renderSessionMarkdown } = require('../src/exporter');

test('createSessionExport reads one demo session and renders markdown', () => {
  const cfg = parseArgs([
    'export',
    '--demo',
    '--provider', 'codex',
    '--id', 'rollout-demo',
  ]);
  const sessionExport = createSessionExport(cfg);
  const markdown = renderSessionMarkdown(sessionExport);

  assert.equal(sessionExport.session.id, 'rollout-demo');
  assert.equal(sessionExport.session.provider, 'codex');
  assert.equal(sessionExport.turns.length, 7);
  assert.match(markdown, /# Agent Session Export/);
  assert.match(markdown, /Provider: codex/);
  assert.match(markdown, /Session ID: rollout-demo/);
  assert.match(markdown, /Demo: add a session export button/);
  assert.match(markdown, /functions\.exec_command/);
  assert.match(markdown, /public\/app\.js/);
});

test('createSessionExport applies strict redaction to markdown output', () => {
  const cfg = parseArgs([
    'export',
    '--demo',
    '--provider', 'codex',
    '--id', 'rollout-demo',
    '--redaction', 'strict',
  ]);
  const sessionExport = createSessionExport(cfg);
  const markdown = renderSessionMarkdown(sessionExport);

  assert.doesNotMatch(markdown, /\/workspace\/agent-session-viewer/);
  assert.match(markdown, /\[REDACTED_PATH\]/);
});

test('CLI export writes markdown to --out path', () => {
  const cli = path.join(__dirname, '..', 'src', 'cli.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-session-viewer-export-'));
  const outFile = path.join(dir, 'session.md');

  const result = spawnSync(process.execPath, [
    cli,
    'export',
    '--demo',
    '--provider', 'claude-code',
    '--id', 'session-claude-demo',
    '--out', outFile,
  ], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  const markdown = fs.readFileSync(outFile, 'utf8');
  assert.match(markdown, /# Agent Session Export/);
  assert.match(markdown, /Provider: claude-code/);
  assert.match(markdown, /Session ID: session-claude-demo/);
  assert.match(markdown, /checkout timeout test/);
});
