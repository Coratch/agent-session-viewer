const assert = require('node:assert/strict');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('src/cli.js runs when invoked directly', () => {
  const cli = path.join(__dirname, '..', 'src', 'cli.js');
  const result = spawnSync(process.execPath, [cli, '--help'], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage: agent-session-viewer/);
  assert.match(result.stdout, /--demo/);
  assert.match(result.stdout, /recap/);
});
