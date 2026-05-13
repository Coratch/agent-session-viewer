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
  assert.ok(sessions.sessions.every((s) => !Object.hasOwn(s, 'meta')));
  assert.equal(sessions.total, 2);
  assert.equal(sessions.offset, 0);
  assert.equal(sessions.limit, 100);
  assert.equal(sessions.hasMore, false);
  assert.deepEqual(sessions.sessions.map((s) => s.provider).sort(), ['claude-code', 'codex']);

  const page = await json(base, '/api/sessions?limit=1&offset=1');
  assert.equal(page.sessions.length, 1);
  assert.equal(page.total, 2);
  assert.equal(page.limit, 1);
  assert.equal(page.offset, 1);
  assert.equal(page.hasMore, false);

  const detail = await json(base, '/api/session?provider=codex&id=rollout-sample');
  assert.equal(detail.session.provider, 'codex');
  assert.equal(detail.session.id, 'rollout-sample');
  assert.ok(detail.turns.length > 0);
  assert.equal(detail.turnsTotal, 6);

  const limitedDetail = await json(base, '/api/session?provider=codex&id=rollout-sample&turnLimit=2');
  assert.equal(limitedDetail.turns.length, 2);
  assert.equal(limitedDetail.turnsTotal, 6);
  assert.deepEqual(limitedDetail.turns.map((turn) => turn.kind), ['tool_result', 'compacted']);

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
  assert.match(html, /RunWhy/);
  assert.match(html, /No session selected/);
  assert.match(html, /workspace-switcher/);
  assert.match(html, /nav-action/);
  assert.match(html, /workspace-view/);
  assert.match(html, /auto-refresh-toggle/);
  assert.match(html, /refresh-now/);
  assert.match(html, /last-refresh/);
  assert.match(html, /load-more-sessions/);
  assert.match(html, /analysis-template/);
  assert.match(html, /analysis-llm/);
  assert.match(html, /run-analysis/);
  assert.match(html, /analysis-actions/);
  assert.match(html, /copy-analysis/);
  assert.match(html, /clear-analysis/);
  assert.match(html, /analysis-progress/);
  assert.match(html, /analysis-cache-note/);
  assert.match(html, /toggle-sidebar/);
  assert.match(html, /toggle-detail-rail/);
  assert.match(html, /turn-kind-filter/);
  assert.match(html, />ALL</);
  assert.match(html, />USER</);
  assert.match(html, />Assistant</);
  assert.match(html, />TOOL_CALL</);
  assert.match(html, />TOOL_RESULT</);
  assert.match(html, />COMPACTED</);
  assert.doesNotMatch(html, /turn-order-toggle/);
  assert.doesNotMatch(html, /jump-latest-turn/);
  assert.doesNotMatch(html, /density-toggle/);
  assert.doesNotMatch(html, /turn-scope-toggle/);
  assert.doesNotMatch(html, /Latest first/);
  assert.match(html, /<details class="side-section workspace-section"/);

  const css = await fetch(`${base}/style.css`).then((r) => r.text());
  assert.match(css, /--bg: #090d12/);
  assert.match(css, /--accent: #5e6ad2/);
  assert.match(css, /\.recap-section/);
  assert.match(css, /\.refresh-controls/);
  assert.match(css, /\.analysis-panel/);
  assert.match(css, /\.session-title-text/);
  assert.match(css, /-webkit-line-clamp: 2/);
  assert.match(css, /sidebar-collapsed/);
  assert.match(css, /detail-collapsed/);
  assert.match(css, /\.analysis-step/);
  assert.match(css, /\.diagnosis-hero/);
  assert.match(css, /\.delay-timeline/);
  assert.match(css, /\.evidence-jump/);
  assert.match(css, /\.turn\.evidence-active/);
  assert.match(css, /\.turn\.evidence-context/);
  assert.match(css, /\.turn\.long-gap/);
  assert.match(css, /\.turn-date-group/);
  assert.match(css, /\.session-date-group/);
  assert.match(css, /\.turn-details/);
  assert.match(css, /\.session-chip/);
  assert.match(css, /\.analysis-cache-note/);

  const app = await fetch(`${base}/app.js`);
  assert.equal(app.status, 200);
  const appJs = await app.text();
  assert.match(appJs, /formatProviderLabel/);
  assert.match(appJs, /refreshActiveSession/);
  assert.match(appJs, /renderRefreshStatus/);
  assert.match(appJs, /renderAnalysis/);
  assert.match(appJs, /analysisCacheKey/);
  assert.match(appJs, /saveAnalysisToCache/);
  assert.match(appJs, /restoreAnalysis/);
  assert.match(appJs, /analysisToMarkdown/);
  assert.match(appJs, /startAnalysisProgress/);
  assert.match(appJs, /renderAnalysisProgress/);
  assert.match(appJs, /toggleSidebar/);
  assert.match(appJs, /toggleDetailRail/);
  assert.match(appJs, /renderDiagnosisHero/);
  assert.match(appJs, /renderDelayTimeline/);
  assert.match(appJs, /jumpToEvidence/);
  assert.match(appJs, /renderSessionDateGroup/);
  assert.match(appJs, /formatFullDateTime/);
  assert.match(appJs, /formatSessionRange/);
  assert.match(appJs, /restoreTurnPreferences/);
  assert.match(appJs, /filterTurnsByKind/);
  assert.match(appJs, /toggleTurnKindFilter/);
  assert.doesNotMatch(appJs, /toggleTurnOrder/);
  assert.doesNotMatch(appJs, /toggleTurnDensity/);
  assert.doesNotMatch(appJs, /toggleTurnScope/);
  assert.doesNotMatch(appJs, /jumpToLatestTurn/);
  assert.match(appJs, /decorateTurns/);
  assert.match(appJs, /renderTurnDateGroup/);
  assert.match(appJs, /isLongGap/);
  assert.match(appJs, /expandEvidenceTurn/);
  assert.match(appJs, /renderSessionChips/);
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

test('server exposes local recap API for the Web UI', async (t) => {
  const server = createServer(parseArgs(['--demo', '--port', '0']));
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const recap = await json(base, '/api/recap?days=30');
  assert.equal(recap.recap.sessions.length, 2);
  assert.match(recap.markdown, /# Pick Up Where I Left Off/);
  assert.match(recap.markdown, /## Active Projects/);
  assert.match(recap.markdown, /agent-session-viewer/);
  assert.match(recap.markdown, /## Next Actions/);
});

test('server exposes analysis templates and single-session analysis API', async (t) => {
  const server = createServer({
    host: '127.0.0.1',
    port: 0,
    providers: ['claude-code', 'codex'],
    claudeDir: path.join(fixtureRoot, 'claude', 'projects'),
    codexDir: path.join(fixtureRoot, 'codex', 'sessions'),
    analysisAdapter: {
      id: 'fake',
      run: async () => ({
        summary: 'Tool execution dominated the session.',
        duration: { totalMs: 1, activeMs: 1, idleMs: 0 },
        topDelaySegments: [{
          category: 'tool_execution',
          durationMs: 1000,
          evidenceTurnIds: ['rollout-sample:3', 'rollout-sample:4'],
          confidence: 'high',
          explanation: 'The command and its output are adjacent evidence.',
        }],
        rootCauses: [{
          cause: 'Command execution',
          evidenceTurnIds: ['rollout-sample:3'],
          recommendation: 'Inspect command output first.',
        }],
        unknowns: [],
        confidence: 'high',
      }),
    },
  });
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const templates = await json(base, '/api/analysis/templates');
  assert.ok(templates.templates.some((template) => template.id === 'time-diagnosis'));
  assert.ok(templates.llms.some((llm) => llm.id === 'claude-p'));

  const analysis = await postJSON(base, '/api/session/analyze', {
    provider: 'codex',
    id: 'rollout-sample',
    templateId: 'time-diagnosis',
    llmId: 'fake',
    customPrompt: 'Focus on tool execution.',
  });
  assert.equal(analysis.templateId, 'time-diagnosis');
  assert.equal(analysis.llmId, 'fake');
  assert.equal(analysis.localChecks.fallbackUsed, false);
  assert.equal(analysis.result.summary, 'Tool execution dominated the session.');
  assert.equal(analysis.result.duration.totalMs > 0, true);

  const bad = await fetch(`${base}/api/session/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ provider: 'codex' }),
  });
  assert.equal(bad.status, 400);
});

async function postJSON(base, pathName, body) {
  const res = await fetch(`${base}${pathName}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status !== 200) {
    assert.fail(`Expected 200, got ${res.status}: ${await res.text()}`);
  }
  assert.equal(res.headers.get('cache-control'), 'no-store');
  return res.json();
}

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
