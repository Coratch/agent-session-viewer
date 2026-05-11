const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');

const { createServer } = require('../src/server');
const { parseArgs } = require('../src/config');

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

test('server serves static frontend assets', async (t) => {
  const server = createServer({
    host: '127.0.0.1',
    port: 0,
    providers: ['claude-code', 'codex'],
    claudeDir: path.join(fixtureRoot, 'claude', 'projects'),
    codexDir: path.join(fixtureRoot, 'codex', 'sessions'),
  });
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const html = await fetch(`${base}/`).then((r) => r.text());
  assert.match(html, /agent-session-viewer/);

  const app = await fetch(`${base}/app.js`);
  assert.equal(app.status, 200);
});

test('server demo mode exposes packaged Claude and Codex sessions', async (t) => {
  const server = createServer(parseArgs(['--demo', '--port', '0']));
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const sessions = await json(base, '/api/sessions');
  assert.equal(sessions.sessions.length, 2);
  assert.deepEqual(sessions.sessions.map((s) => s.provider).sort(), ['claude-code', 'codex']);
  assert.ok(sessions.sessions.some((s) => /demo/i.test(s.title)));

  const codex = sessions.sessions.find((s) => s.provider === 'codex');
  const detail = await json(base, `/api/session?provider=codex&id=${encodeURIComponent(codex.id)}`);
  assert.ok(detail.turns.some((turn) => turn.kind === 'reasoning'));
  assert.ok(detail.turns.some((turn) => turn.kind === 'tool_call'));
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
