const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const { parseArgs } = require('../src/config');
const { createRecap, renderRecapMarkdown } = require('../src/recap');

test('createRecap builds a local markdown recap from demo sessions', () => {
  const cfg = parseArgs(['recap', '--demo', '--days', '30']);
  const recap = createRecap(cfg, { now: new Date('2026-05-12T00:00:00.000Z') });
  const markdown = renderRecapMarkdown(recap);

  assert.equal(recap.sessions.length, 2);
  assert.deepEqual([...new Set(recap.sessions.map((s) => s.provider))].sort(), ['claude-code', 'codex']);
  assert.match(markdown, /# Pick Up Where I Left Off/);
  assert.match(markdown, /## Active Projects/);
  assert.match(markdown, /demo-app/);
  assert.match(markdown, /agent-session-viewer/);
  assert.match(markdown, /## Completed/);
  assert.match(markdown, /npm test -- checkout-timeout/);
  assert.match(markdown, /## Commands And Files/);
  assert.match(markdown, /functions\.exec_command/);
  assert.doesNotMatch(markdown, /^- file:\s*$/m);
  assert.match(markdown, /## Next Actions/);
});

test('createRecap filters by provider and project', () => {
  const cfg = parseArgs(['recap', '--demo', '--provider', 'codex', '--project', 'agent-session-viewer', '--days', '30']);
  const recap = createRecap(cfg, { now: new Date('2026-05-12T00:00:00.000Z') });

  assert.equal(recap.sessions.length, 1);
  assert.equal(recap.sessions[0].provider, 'codex');
  assert.equal(recap.projects.length, 1);
  assert.equal(recap.projects[0].name, 'agent-session-viewer');
});

test('demo recap includes packaged fixtures without requiring a date range', () => {
  const cfg = parseArgs(['recap', '--demo']);
  const recap = createRecap(cfg, { now: new Date('2027-01-01T00:00:00.000Z') });

  assert.equal(recap.sessions.length, 2);
});

test('CLI recap writes markdown to --out path', () => {
  const cli = path.join(__dirname, '..', 'src', 'cli.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-session-viewer-recap-'));
  const outFile = path.join(dir, 'recap.md');

  const result = spawnSync(process.execPath, [
    cli,
    'recap',
    '--demo',
    '--days', '30',
    '--out', outFile,
  ], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  const markdown = fs.readFileSync(outFile, 'utf8');
  assert.match(markdown, /# Pick Up Where I Left Off/);
  assert.match(markdown, /## Open Threads/);
});
