const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
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

  const searched = await json(base, '/api/sessions?q=inspect');
  assert.equal(searched.sessions.length, 1);
  assert.equal(searched.total, 1);
  assert.equal(searched.query, 'inspect');
  assert.equal(searched.sessions[0].provider, 'claude-code');
  assert.equal(searched.sessions[0].title, 'inspect repository');

  const detail = await json(base, '/api/session?provider=codex&id=rollout-sample');
  assert.equal(detail.session.provider, 'codex');
  assert.equal(detail.session.id, 'rollout-sample');
  assert.ok(detail.turns.length > 0);
  assert.equal(detail.turnsTotal, 6);

  const limitedDetail = await json(base, '/api/session?provider=codex&id=rollout-sample&turnLimit=2');
  assert.equal(limitedDetail.turns.length, 2);
  assert.equal(limitedDetail.turnsTotal, 6);
  assert.equal(limitedDetail.turnLimit, 2);
  assert.deepEqual(limitedDetail.loadedRange, { start: 4, end: 6 });
  assert.equal(limitedDetail.hasOlderTurns, true);
  assert.equal(limitedDetail.olderCursor, 4);
  assert.equal(limitedDetail.hasNewerTurns, false);
  assert.equal(limitedDetail.newerCursor, null);
  assert.deepEqual(limitedDetail.turns.map((turn) => turn.kind), ['tool_result', 'compacted']);

  const olderDetail = await json(base, `/api/session?provider=codex&id=rollout-sample&turnLimit=2&beforeTurn=${limitedDetail.olderCursor}`);
  assert.equal(olderDetail.turns.length, 2);
  assert.equal(olderDetail.turnsTotal, 6);
  assert.deepEqual(olderDetail.loadedRange, { start: 2, end: 4 });
  assert.equal(olderDetail.hasOlderTurns, true);
  assert.equal(olderDetail.olderCursor, 2);
  assert.equal(olderDetail.hasNewerTurns, true);
  assert.equal(olderDetail.newerCursor, 4);
  assert.deepEqual(olderDetail.turns.map((turn) => turn.kind), ['reasoning', 'tool_call']);

  const focusedDetail = await json(base, '/api/session?provider=codex&id=rollout-sample&turnLimit=1&turnId=rollout-sample%3A3');
  assert.equal(focusedDetail.targetTurnFound, true);
  assert.deepEqual(focusedDetail.loadedRange, { start: 3, end: 4 });
  assert.deepEqual(focusedDetail.turns.map((turn) => turn.id), ['rollout-sample:3']);

  const centeredWindow = await json(base, '/api/session/turns?provider=codex&id=rollout-sample&centerTurnId=rollout-sample%3A3&before=1&after=1');
  assert.equal(centeredWindow.turnsTotal, 6);
  assert.deepEqual(centeredWindow.loadedRange, { start: 2, end: 5 });
  assert.deepEqual(centeredWindow.target, { turnId: 'rollout-sample:3', ordinal: 3, found: true });
  assert.deepEqual(centeredWindow.turns.map((turn) => turn.ordinal), [2, 3, 4]);
  assert.deepEqual(centeredWindow.turns.map((turn) => turn.kind), ['reasoning', 'tool_call', 'tool_result']);
  assert.equal(centeredWindow.hasOlder, true);
  assert.equal(centeredWindow.hasNewer, true);

  const afterWindow = await json(base, '/api/session/turns?provider=codex&id=rollout-sample&afterOrdinal=1&limit=2');
  assert.deepEqual(afterWindow.loadedRange, { start: 2, end: 4 });
  assert.deepEqual(afterWindow.turns.map((turn) => turn.ordinal), [2, 3]);

  const beforeWindow = await json(base, '/api/session/turns?provider=codex&id=rollout-sample&beforeOrdinal=4&limit=2');
  assert.deepEqual(beforeWindow.loadedRange, { start: 2, end: 4 });
  assert.deepEqual(beforeWindow.turns.map((turn) => turn.ordinal), [2, 3]);

  const missingWindow = await json(base, '/api/session/turns?provider=codex&id=rollout-sample&centerTurnId=missing-turn&before=1&after=1');
  assert.deepEqual(missingWindow.loadedRange, { start: 0, end: 0 });
  assert.equal(missingWindow.turns.length, 0);
  assert.deepEqual(missingWindow.target, { turnId: 'missing-turn', ordinal: null, found: false });

  const search = await json(base, '/api/session/search?provider=codex&id=rollout-sample&q=checked%20files&limit=10');
  assert.equal(search.query, 'checked files');
  assert.equal(search.hits.length, 1);
  assert.equal(search.hits[0].turnId, 'rollout-sample:2');
  assert.equal(search.hits[0].ordinal, 2);
  assert.equal(search.hits[0].kind, 'reasoning');
  assert.match(search.hits[0].snippet, /checked files/);
  assert.equal(search.nextCursor, null);

  const bad = await fetch(`${base}/api/session?provider=codex&id=${encodeURIComponent('/etc/passwd')}`);
  assert.equal(bad.status, 404);
});

test('server serves classic static frontend assets when requested', async (t) => {
  const server = createServer({
    host: '127.0.0.1',
    port: 0,
    ui: 'classic',
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
  assert.match(html, /topbar-query-group/);
  assert.match(html, /topbar-recap-group/);
  assert.match(html, /topbar-tool-group/);
  assert.match(html, /settings-button/);
  assert.match(html, /settings-popover/);
  assert.match(html, /settings-panel/);
  assert.match(html, /recap-popover/);
  assert.match(html, /run-recap/);
  assert.match(html, /primary-action/);
  assert.doesNotMatch(html, /refresh-source-icon/);
  assert.match(html, /label\.last/);
  assert.match(html, /label\.daysUnit/);
  assert.match(html, /language-switcher/);
  assert.match(html, /简体中文/);
  assert.doesNotMatch(html, /auto-refresh-toggle/);
  assert.doesNotMatch(html, /refresh-now/);
  assert.doesNotMatch(html, /last-refresh/);
  assert.doesNotMatch(html, /refresh-interval/);
  assert.match(html, /load-more-sessions/);
  assert.match(html, /session-range-status/);
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
  assert.match(html, /turn-range-status/);
  assert.match(html, /turn-session-search/);
  assert.match(html, /turn-search-results/);
  assert.match(html, /Search turns/);
  assert.doesNotMatch(html, /Find in loaded turns/);
  assert.doesNotMatch(html, /load-older-turns/);
  assert.doesNotMatch(html, /load-max-turns/);
  assert.doesNotMatch(html, /Load older 500/);
  assert.doesNotMatch(html, /Load latest 1000/);
  assert.match(html, />ALL</);
  assert.match(html, />USER</);
  assert.match(html, />Assistant</);
  assert.match(html, />REASONING</);
  assert.match(html, />TOOL_CALL</);
  assert.match(html, />TOOL_RESULT</);
  assert.match(html, />HOOK</);
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
  assert.match(css, /\.topbar-query-group/);
  assert.match(css, /\.topbar-recap-group/);
  assert.match(css, /\.topbar-tool-group/);
  assert.match(css, /\.topbar-popover/);
  assert.match(css, /\.settings-popover/);
  assert.match(css, /\.recap-popover/);
  assert.match(css, /\.settings-button/);
  assert.match(css, /\.primary-action/);
  assert.match(css, /\.icon-button/);
  assert.match(css, /\.language-switcher/);
  assert.doesNotMatch(css, /\.refresh-controls/);
  assert.doesNotMatch(css, /\.sync-panel/);
  assert.doesNotMatch(css, /\.last-refresh/);
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
  assert.match(css, /\.session-range-status/);
  assert.match(css, /\.turn-details/);
  assert.match(css, /\.turn-range-controls/);
  assert.match(css, /\.turn-range-status/);
  assert.match(css, /\.turn-search-panel/);
  assert.match(css, /\.turn-search-results/);
  assert.match(css, /\.turn-search-result/);
  assert.doesNotMatch(css, /\.turn-page-button/);
  assert.doesNotMatch(css, /\.turn-window-note/);
  assert.doesNotMatch(css, /\.turn-search-match/);
  assert.match(css, /\.tool-run-group/);
  assert.match(css, /\.role\.hook/);
  assert.match(css, /\.session-chip/);
  assert.match(css, /\.analysis-cache-note/);

  const app = await fetch(`${base}/app.js`);
  assert.equal(app.status, 200);
  const appJs = await app.text();
  assert.match(appJs, /formatProviderLabel/);
  assert.match(appJs, /TRANSLATIONS/);
  assert.match(appJs, /label\.last/);
  assert.match(appJs, /label\.daysUnit/);
  assert.match(appJs, /setLanguage/);
  assert.match(appJs, /applyLanguage/);
  assert.match(appJs, /toggleSettingsPopover/);
  assert.match(appJs, /toggleRecapPopover/);
  assert.match(appJs, /closeTopbarPopovers/);
  assert.doesNotMatch(appJs, /refreshActiveSession/);
  assert.doesNotMatch(appJs, /refreshSources/);
  assert.doesNotMatch(appJs, /renderRefreshStatus/);
  assert.doesNotMatch(appJs, /startRefreshTimer/);
  assert.doesNotMatch(appJs, /refreshTick/);
  assert.doesNotMatch(appJs, /autoRefresh/);
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
  assert.match(appJs, /scheduleSessionSearch/);
  assert.match(appJs, /searchSessionTurns/);
  assert.match(appJs, /renderTurnSearchResults/);
  assert.match(appJs, /clearTurnSearchResults/);
  assert.match(appJs, /mergeTurnWindow/);
  assert.match(appJs, /TURN_SCROLL_LOAD_THRESHOLD_PX/);
  assert.match(appJs, /TURN_WINDOW_CACHE_LIMIT/);
  assert.match(appJs, /getTurnScrollElement/);
  assert.match(appJs, /maybeLoadOlderTurns/);
  assert.match(appJs, /loadOlderTurnWindow/);
  assert.match(appJs, /trimTurnWindows/);
  assert.match(appJs, /renderSessionRangeStatus/);
  assert.match(appJs, /loadTurnsAround/);
  assert.doesNotMatch(appJs, /loadOlderTurns/);
  assert.doesNotMatch(appJs, /loadMaxTurns/);
  assert.doesNotMatch(appJs, /turn-window-note/);
  assert.doesNotMatch(appJs, /jumpTurnSearchMatch/);
  assert.doesNotMatch(appJs, /turnMatchesSearch/);
  assert.match(appJs, /groupOperationalRuns/);
  assert.match(appJs, /renderToolRunGroup/);
  assert.match(appJs, /hook/);
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

test('server serves React Vite build assets by default', async (t) => {
  const webDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runwhy-web-default-dist-'));
  fs.mkdirSync(path.join(webDistDir, 'assets'), { recursive: true });
  fs.writeFileSync(
    path.join(webDistDir, 'index.html'),
    '<!doctype html><div id="root">Default React Vite Shell</div><script type="module" src="/assets/main.js"></script>',
  );
  fs.writeFileSync(path.join(webDistDir, 'assets', 'main.js'), 'console.log("Default React Vite Shell asset");');
  t.after(() => fs.rmSync(webDistDir, { recursive: true, force: true }));

  const server = createServer({
    host: '127.0.0.1',
    port: 0,
    providers: ['claude-code', 'codex'],
    claudeDir: path.join(fixtureRoot, 'claude', 'projects'),
    codexDir: path.join(fixtureRoot, 'codex', 'sessions'),
    webDistDir,
  });
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const html = await fetch(`${base}/`).then((r) => r.text());
  assert.match(html, /Default React Vite Shell/);

  const asset = await fetch(`${base}/assets/main.js`);
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /Default React Vite Shell asset/);
});

test('server can serve React Vite build assets when requested', async (t) => {
  const webDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runwhy-web-dist-'));
  fs.mkdirSync(path.join(webDistDir, 'assets'), { recursive: true });
  fs.writeFileSync(
    path.join(webDistDir, 'index.html'),
    '<!doctype html><div id="root">React Vite Shell</div><script type="module" src="/assets/main.js"></script>',
  );
  fs.writeFileSync(path.join(webDistDir, 'assets', 'main.js'), 'console.log("React Vite Shell asset");');
  t.after(() => fs.rmSync(webDistDir, { recursive: true, force: true }));

  const server = createServer({
    host: '127.0.0.1',
    port: 0,
    providers: ['claude-code', 'codex'],
    claudeDir: path.join(fixtureRoot, 'claude', 'projects'),
    codexDir: path.join(fixtureRoot, 'codex', 'sessions'),
    ui: 'react',
    webDistDir,
  });
  const base = await listen(server);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const html = await fetch(`${base}/`).then((r) => r.text());
  assert.match(html, /React Vite Shell/);

  const asset = await fetch(`${base}/assets/main.js`);
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /React Vite Shell asset/);

  const missing = await fetch(`${base}/package.json`);
  assert.equal(missing.status, 404);
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

  const claude = sessions.sessions.find((s) => s.provider === 'claude-code');
  const claudeDetail = await json(base, `/api/session?provider=claude-code&id=${encodeURIComponent(claude.id)}`);
  assert.ok(claudeDetail.turns.some((turn) => turn.kind === 'reasoning'));
  assert.ok(claudeDetail.turns.some((turn) => turn.kind === 'tool_call'));
  assert.ok(claudeDetail.turns.some((turn) => turn.kind === 'tool_result'));
  assert.ok(claudeDetail.turns.some((turn) => turn.kind === 'hook'));
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
