const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const { createServer } = require('../src/server');

const fixtureRoot = path.join(__dirname, 'fixtures');

test('server exposes provider-neutral APIs without absolute file paths', async (t) => {
  const server = createServer({
    host: '127.0.0.1',
    port: 0,
    providers: ['claude-code', 'codex'],
    claudeDir: path.join(fixtureRoot, 'claude', 'projects'),
    codexDir: path.join(fixtureRoot, 'codex', 'sessions'),
  });
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const providers = await json(base, '/api/providers');
  assert.deepEqual(providers.providers.map((p) => p.id), ['claude-code', 'codex']);

  const sessions = await json(base, '/api/sessions');
  assert.equal(sessions.sessions.length, 2);
  assert.ok(sessions.sessions.every((s) => !Object.hasOwn(s, 'file')));
  assert.deepEqual(sessions.sessions.map((s) => s.provider).sort(), ['claude-code', 'codex']);

  const detail = await json(base, '/api/session?provider=codex&id=rollout-sample');
  assert.equal(detail.session.provider, 'codex');
  assert.equal(detail.session.id, 'rollout-sample');
  assert.ok(detail.turns.length > 0);

  const bad = await fetch(`${base}/api/session?provider=codex&id=${encodeURIComponent('/etc/passwd')}`);
  assert.equal(bad.status, 404);
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function json(base, pathName) {
  const res = await fetch(`${base}${pathName}`);
  if (res.status !== 200) {
    assert.fail(`Expected 200, got ${res.status}: ${await res.text()}`);
  }
  assert.equal(res.headers.get('cache-control'), 'no-store');
  return res.json();
}
