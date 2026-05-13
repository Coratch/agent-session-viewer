const $ = (id) => document.getElementById(id);
const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
const SESSION_PAGE_SIZE = 20;
const SESSION_TURN_LIMIT = 120;
const ANALYSIS_STAGE_INTERVAL_MS = 1400;
const ANALYSIS_STAGES = [
  ['Request', 'Session, template, and focus prepared.'],
  ['Evidence', 'Building redacted turn evidence and trusted timing metrics.'],
  ['Prompt', 'Assembling guarded prompt with local checks.'],
  ['LLM', 'Running selected headless model adapter.'],
  ['Validate', 'Checking structured output and evidence references.'],
  ['Save', 'Rendering report and saving local share copy.'],
];

const state = {
  providers: [],
  sessions: [],
  sessionTotal: 0,
  sessionOffset: 0,
  hasMoreSessions: false,
  loadingSessions: false,
  providerFilter: 'all',
  filter: '',
  active: null,
  activeSession: null,
  recapMarkdown: '',
  autoRefresh: true,
  refreshIntervalMs: DEFAULT_REFRESH_INTERVAL_MS,
  refreshTimer: null,
  refreshing: false,
  lastRefreshAt: null,
  refreshError: '',
  analysisTemplates: [],
  analysisLlms: [],
  analysisLoading: false,
  analysisCurrent: null,
  analysisProgressTimer: null,
  analysisStartedAt: null,
  analysisStageIndex: 0,
  analysisProgressStatus: 'idle',
  sidebarCollapsed: false,
  detailCollapsed: false,
  analyzedSessionKeys: new Set(),
};

function fmtTokens(n) {
  if (n == null) return '-';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(1) + 'k';
  return (n / 1_000_000).toFixed(2) + 'M';
}

function fmtCost(cost) {
  if (cost == null) return '-';
  if (cost < 0.01) return '$' + cost.toFixed(4);
  if (cost < 1) return '$' + cost.toFixed(3);
  return '$' + cost.toFixed(2);
}

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString();
}

function formatProviderLabel(provider) {
  if (provider === 'claude-code') return 'Claude Code';
  if (provider === 'codex') return 'Codex';
  return provider || 'Provider';
}

function shortTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function init() {
  restoreLayoutState();
  await loadProviders();
  await loadAnalysisTemplates();
  await loadSessions({ reset: true });
}

async function loadProviders() {
  const res = await fetch('/api/providers');
  const data = await res.json();
  state.providers = data.providers || [];

  const filter = $('provider-filter');
  for (const provider of state.providers) {
    const opt = document.createElement('option');
    opt.value = provider.id;
    opt.textContent = provider.label || formatProviderLabel(provider.id);
    filter.appendChild(opt);
  }

  $('provider-roots').innerHTML = state.providers.length
    ? state.providers
      .map((p) => `
        <div class="root-row">
          <span>${escapeHtml(formatProviderLabel(p.id))}</span>
          <code>${escapeHtml(p.rootDir || '')}</code>
        </div>
      `)
      .join('')
    : '<div class="root-row"><span>No providers</span><code>Run with --demo or configure local roots.</code></div>';
}

async function loadAnalysisTemplates() {
  const templateSelect = $('analysis-template');
  const llmSelect = $('analysis-llm');
  if (!templateSelect || !llmSelect) return;
  const res = await fetch('/api/analysis/templates');
  const data = await res.json();
  state.analysisTemplates = data.templates || [];
  state.analysisLlms = data.llms || [];
  templateSelect.innerHTML = state.analysisTemplates
    .map((template) => `
      <option value="${escapeHtml(template.id)}" ${template.disabled ? 'disabled' : ''}>
        ${escapeHtml(template.title || template.id)}
      </option>
    `)
    .join('');
  llmSelect.innerHTML = state.analysisLlms
    .map((llm) => `
      <option value="${escapeHtml(llm.id)}" ${llm.enabled === false ? 'disabled' : ''}>
        ${escapeHtml(llm.label || llm.id)}
      </option>
    `)
    .join('');
}

async function loadSessions(options = {}) {
  const append = options.append === true;
  const reset = options.reset === true;
  const offset = append ? state.sessions.length : 0;
  if (state.loadingSessions) return;
  state.loadingSessions = true;
  renderSessionPaging();
  try {
    const params = new URLSearchParams({
      provider: state.providerFilter,
      limit: String(SESSION_PAGE_SIZE),
      offset: String(offset),
    });
    const res = await fetch('/api/sessions?' + params.toString());
    const data = await res.json();
    state.sessions = append ? state.sessions.concat(data.sessions || []) : data.sessions || [];
    state.sessionTotal = data.total || state.sessions.length;
    state.sessionOffset = data.offset || 0;
    state.hasMoreSessions = Boolean(data.hasMore);
    renderSessionList();
    if (reset || !state.active) {
      showEmpty();
    }
  } finally {
    state.loadingSessions = false;
    renderSessionPaging();
  }
}

function filteredSessions() {
  const q = state.filter.toLowerCase();
  return state.sessions.filter((s) => {
    if (!q) return true;
    return [
      s.provider,
      s.project,
      s.id,
      s.title,
      s.model,
      s.cwd,
    ].some((value) => String(value || '').toLowerCase().includes(q));
  });
}

function renderSessionList() {
  const sessions = filteredSessions();
  const list = $('session-list');
  list.innerHTML = '';
  if ($('session-count')) $('session-count').textContent = String(state.sessionTotal || sessions.length);
  $('recap-btn').classList.toggle('active', state.active === 'recap');
  if ($('sessions-nav')) $('sessions-nav').classList.toggle('active', state.active !== 'recap');
  if (!sessions.length) {
    const empty = document.createElement('div');
    empty.className = 'list-empty';
    empty.innerHTML = '<strong>No sessions found</strong><span>Adjust the provider or filter.</span>';
    list.appendChild(empty);
    return;
  }

  for (const session of sessions) {
    list.appendChild(renderSessionItem(session));
  }
  renderSessionPaging();
}

function renderSessionItem(session) {
  const item = document.createElement('button');
  item.className = 'session-item' + (isActive(session) ? ' active' : '');
  item.type = 'button';
  item.title = session.title || session.id;
  item.setAttribute('aria-pressed', isActive(session) ? 'true' : 'false');
  item.setAttribute('aria-label', session.title || session.id);

  const summary = session.summary || {};
  const project = session.project || session.cwd || session.id;
  item.innerHTML = `
    <div class="si-row">
      <span class="provider ${escapeHtml(session.provider)}">${escapeHtml(formatProviderLabel(session.provider))}</span>
      <span class="si-title">${escapeHtml(session.title || session.id)}</span>
    </div>
    ${renderSessionChips(session)}
    <div class="si-project">${escapeHtml(project)}</div>
    <div class="si-meta">
      <span>${shortTime(session.updatedAt)}</span>
      <span>${summary.turns || 0} turns</span>
    </div>
  `;
  item.addEventListener('click', () => loadSession(session));
  return item;
}

function renderSessionChips(session) {
  const chips = [];
  const summary = session.summary || {};
  const key = sessionKey(session);
  if (state.analyzedSessionKeys.has(key) || hasSavedAnalysis(session)) chips.push('Analyzed');
  if ((summary.turns || 0) >= 80) chips.push('Long');
  if (session.status && session.status !== 'completed') chips.push(session.status);
  if (!chips.length) return '';
  return `
    <div class="session-chips">
      ${chips.slice(0, 3).map((chip) => `<span class="session-chip">${escapeHtml(chip)}</span>`).join('')}
    </div>
  `;
}

function hasSavedAnalysis(session) {
  for (const template of state.analysisTemplates.length ? state.analysisTemplates : [{ id: 'time-diagnosis' }]) {
    const key = analysisCacheKey(session, template.id);
    if (!key) continue;
    try {
      if (localStorage.getItem(key)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function fetchSessionDetail(session) {
  const params = new URLSearchParams({
    provider: session.provider,
    id: session.id,
    turnLimit: String(SESSION_TURN_LIMIT),
  });
  const res = await fetch('/api/session?' + params.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadSession(session, options = {}) {
  const silent = options.silent === true;
  state.active = sessionKey(session);
  state.activeSession = {
    provider: session.provider,
    id: session.id,
    title: session.title || session.id,
    project: session.project || '',
  };
  renderSessionList();
  if (!silent) showLoading(session);

  try {
    renderSession(await fetchSessionDetail(session));
  } catch (err) {
    if (silent) {
      state.refreshError = err.message || String(err);
      renderRefreshStatus();
      return;
    }
    showError(session, err.message || String(err));
  }
}

async function loadRecap() {
  state.active = 'recap';
  state.activeSession = null;
  renderSessionList();
  $('empty').hidden = true;
  $('session-view').hidden = true;
  $('recap-view').hidden = false;
  $('recap-btn').disabled = true;
  $('recap-btn').textContent = 'Generating...';
  $('recap-meta').textContent = 'loading...';
  $('recap-content').innerHTML = '<div class="loading">generating recap...</div>';

  const params = new URLSearchParams({
    days: String(Math.max(1, Number($('recap-days').value) || 7)),
    provider: state.providerFilter,
  });
  if (state.filter.trim()) params.set('project', state.filter.trim());

  try {
    const res = await fetch('/api/recap?' + params.toString());
    if (!res.ok) {
      showRecapError(await res.text());
      return;
    }
    const data = await res.json();
    renderRecap(data);
  } finally {
    $('recap-btn').disabled = false;
    $('recap-btn').textContent = 'Resume Work';
    $('recap-btn').classList.toggle('active', state.active === 'recap');
  }
}

function showEmpty() {
  state.activeSession = null;
  $('empty').hidden = false;
  $('recap-view').hidden = true;
  $('session-view').hidden = true;
  clearAnalysis();
}

function showLoading(session) {
  $('empty').hidden = true;
  $('recap-view').hidden = true;
  $('session-view').hidden = false;
  $('session-title').textContent = session.title || session.id;
  $('session-meta').textContent = 'loading...';
  $('session-totals').innerHTML = '';
  $('session-context').innerHTML = '';
  $('turns').innerHTML = '<div class="loading">loading session...</div>';
  clearAnalysis('Select a loaded session to analyze.');
}

function showError(session, message) {
  $('empty').hidden = true;
  $('recap-view').hidden = true;
  $('session-view').hidden = false;
  $('session-title').textContent = session.title || session.id;
  $('session-meta').textContent = 'error';
  $('session-totals').innerHTML = '';
  $('turns').innerHTML = '';
  const el = document.createElement('pre');
  el.className = 'error';
  el.textContent = message;
  $('turns').appendChild(el);
}

function showRecapError(message) {
  $('recap-meta').textContent = 'error';
  $('recap-content').innerHTML = '';
  const el = document.createElement('pre');
  el.className = 'error';
  el.textContent = message;
  $('recap-content').appendChild(el);
}

function renderSession(data) {
  const session = data.session;
  const summary = session.summary || {};

  state.active = sessionKey(session);
  state.activeSession = {
    provider: session.provider,
    id: session.id,
    title: session.title || session.id,
    project: session.project || '',
  };
  state.lastRefreshAt = new Date();
  state.refreshError = '';

  $('empty').hidden = true;
  $('recap-view').hidden = true;
  $('session-view').hidden = false;
  const title = session.title || session.id;
  $('session-title').innerHTML = `
    <span class="provider ${escapeHtml(session.provider)}">${escapeHtml(formatProviderLabel(session.provider))}</span>
    <span class="session-title-text" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
  `;
  $('session-meta').innerHTML = `
    <div>${escapeHtml(session.project || '')} <span class="dim">${escapeHtml(session.id)}</span></div>
    <div>${escapeHtml(fmtTime(session.createdAt))} -> ${escapeHtml(fmtTime(session.updatedAt))}</div>
    <div>model: ${escapeHtml(session.model || '-')}</div>
  `;
  $('session-totals').innerHTML = `
    <div class="stat cost"><div class="label">Cost</div><div class="value">${fmtCost(summary.costUSD)}</div></div>
    <div class="stat"><div class="label">Turns</div><div class="value">${summary.turns || 0}</div></div>
    <div class="stat"><div class="label">Input</div><div class="value">${fmtTokens(summary.inputTokens || 0)}</div></div>
    <div class="stat"><div class="label">Output</div><div class="value">${fmtTokens(summary.outputTokens || 0)}</div></div>
    <div class="stat"><div class="label">Cache read</div><div class="value">${fmtTokens(summary.cacheReadTokens || 0)}</div></div>
    <div class="stat"><div class="label">Cache write</div><div class="value">${fmtTokens(summary.cacheWriteTokens || 0)}</div></div>
  `;
  renderContext(session);
  restoreAnalysis();

  const turns = $('turns');
  turns.innerHTML = '';
  if (data.turnsTotal > (data.turns || []).length) {
    const note = document.createElement('div');
    note.className = 'turn-window-note';
    note.textContent = `Showing latest ${(data.turns || []).length} of ${data.turnsTotal} turns.`;
    turns.appendChild(note);
  }
  for (const turn of data.turns || []) {
    turns.appendChild(renderTurn(turn));
  }
  renderRefreshStatus();
}

function renderRecap(data) {
  const recap = data.recap || {};
  state.recapMarkdown = data.markdown || '';
  $('recap-meta').textContent = [
    `${(recap.sessions || []).length} sessions`,
    `${(recap.projects || []).length} projects`,
    `since ${fmtTime(recap.since)}`,
  ].join(' · ');
  $('recap-content').innerHTML = '';
  for (const section of parseMarkdownSections(state.recapMarkdown)) {
    const card = document.createElement('section');
    card.className = `recap-section ${sectionSlug(section.title)}`;
    const title = document.createElement('h3');
    title.textContent = section.title;
    const body = document.createElement('div');
    body.className = 'recap-body';
    body.textContent = section.body || 'No items found.';
    card.append(title, body);
    $('recap-content').appendChild(card);
  }
}

function sectionSlug(title) {
  return 'recap-' + String(title || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseMarkdownSections(markdown) {
  const sections = [];
  const lines = String(markdown || '').split('\n');
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, ''), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);
  return sections;
}

function renderContext(session) {
  const tags = [];
  if (session.cwd) tags.push(['cwd', session.cwd]);
  for (const [key, value] of Object.entries(session.meta || {})) {
    if (value == null || value === '') continue;
    tags.push([key, String(value)]);
  }
  $('session-context').innerHTML = tags
    .map(([key, value]) => `<span class="tag"><b>${escapeHtml(key)}:</b> ${escapeHtml(value)}</span>`)
    .join('');
}

function renderTurn(turn) {
  const el = document.createElement('article');
  el.className = 'turn ' + turn.kind;
  el.id = turnElementId(turn.id);
  el.dataset.turnId = turn.id || '';

  const head = document.createElement('div');
  head.className = 'turn-head';
  head.innerHTML = `
    <div class="left">
      <span class="role ${escapeHtml(turn.kind)}">${escapeHtml(turn.kind)}</span>
      <span class="ts">${escapeHtml(shortTime(turn.timestamp))}</span>
      <span class="turn-title">${escapeHtml(turn.title || '')}</span>
    </div>
    ${usageHtml(turn)}
  `;
  el.appendChild(head);

  const body = document.createElement('div');
  body.className = 'turn-body';
  body.textContent = turn.text || '';
  el.appendChild(body);

  requestAnimationFrame(() => {
    if (body.scrollHeight > 360) {
      body.classList.add('collapsed');
      const btn = document.createElement('button');
      btn.className = 'expand-btn';
      btn.type = 'button';
      btn.textContent = 'Expand';
      btn.addEventListener('click', () => {
        body.classList.toggle('collapsed');
        btn.textContent = body.classList.contains('collapsed') ? 'Expand' : 'Collapse';
      });
      el.appendChild(btn);
    }
  });

  return el;
}

function turnElementId(turnId) {
  return 'turn-' + encodeURIComponent(String(turnId || 'unknown'));
}

function usageHtml(turn) {
  if (!turn.usage) return '';
  return `
    <div class="usage">
      <span>in ${fmtTokens(turn.usage.inputTokens || 0)}</span>
      <span>out ${fmtTokens(turn.usage.outputTokens || 0)}</span>
      <span>cr ${fmtTokens(turn.usage.cacheReadTokens || 0)}</span>
      <span>cw ${fmtTokens(turn.usage.cacheWriteTokens || 0)}</span>
      <span class="cost">${fmtCost(turn.costUSD)}</span>
    </div>
  `;
}

function isActive(session) {
  return state.active === sessionKey(session);
}

function sessionKey(session) {
  return `${session.provider}:${session.id}`;
}

function restoreLayoutState() {
  try {
    const raw = localStorage.getItem('agent-session-viewer:layout:v1');
    if (raw) {
      const layout = JSON.parse(raw);
      state.sidebarCollapsed = Boolean(layout.sidebarCollapsed);
      state.detailCollapsed = Boolean(layout.detailCollapsed);
    }
  } catch {}
  renderLayoutState();
}

function saveLayoutState() {
  try {
    localStorage.setItem('agent-session-viewer:layout:v1', JSON.stringify({
      sidebarCollapsed: state.sidebarCollapsed,
      detailCollapsed: state.detailCollapsed,
    }));
  } catch {}
}

function renderLayoutState() {
  const app = $('app');
  if (!app) return;
  app.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  app.classList.toggle('detail-collapsed', state.detailCollapsed);

  const sidebarButton = $('toggle-sidebar');
  if (sidebarButton) {
    sidebarButton.setAttribute('aria-expanded', String(!state.sidebarCollapsed));
    sidebarButton.setAttribute('aria-label', state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    sidebarButton.textContent = state.sidebarCollapsed ? '>>' : '<<';
  }

  const detailButton = $('toggle-detail-rail');
  if (detailButton) {
    detailButton.setAttribute('aria-expanded', String(!state.detailCollapsed));
    detailButton.setAttribute('aria-label', state.detailCollapsed ? 'Expand details' : 'Collapse details');
    detailButton.textContent = state.detailCollapsed ? '<<' : '>>';
  }
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  saveLayoutState();
  renderLayoutState();
}

function toggleDetailRail() {
  state.detailCollapsed = !state.detailCollapsed;
  saveLayoutState();
  renderLayoutState();
}

async function refreshActiveSession() {
  if (!state.activeSession || state.active === 'recap' || state.refreshing) return;
  const sessionRef = { ...state.activeSession };
  state.refreshing = true;
  state.refreshError = '';
  renderRefreshStatus();
  try {
    const data = await fetchSessionDetail(sessionRef);
    if (state.active === sessionKey(sessionRef)) renderSession(data);
  } catch (err) {
    state.refreshError = err.message || String(err);
  } finally {
    state.refreshing = false;
    renderRefreshStatus();
  }
}

async function refreshSources() {
  if (state.refreshing) return;
  await loadSessions();
  await refreshActiveSession();
}

async function refreshTick() {
  if (!state.autoRefresh || state.refreshing) return;
  await loadSessions();
  await refreshActiveSession();
}

function startRefreshTimer() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    refreshTick().catch((err) => {
      state.refreshError = err.message || String(err);
      renderRefreshStatus();
    });
  }, state.refreshIntervalMs);
}

function renderRefreshStatus() {
  const toggle = $('auto-refresh-toggle');
  const interval = $('refresh-interval');
  const button = $('refresh-now');
  const status = $('last-refresh');
  if (!toggle || !interval || !button || !status) return;

  toggle.checked = state.autoRefresh;
  interval.value = String(state.refreshIntervalMs);
  button.disabled = state.refreshing || !state.activeSession || state.active === 'recap';

  status.classList.toggle('error', Boolean(state.refreshError));
  if (state.refreshing) {
    status.textContent = 'Refreshing...';
  } else if (state.refreshError) {
    status.textContent = 'Refresh failed';
  } else if (state.lastRefreshAt) {
    status.textContent = `Updated ${shortTime(state.lastRefreshAt.toISOString())}`;
  } else {
    status.textContent = 'Not refreshed yet';
  }
}

function renderSessionPaging() {
  const button = $('load-more-sessions');
  if (!button) return;
  button.hidden = !state.hasMoreSessions && !state.loadingSessions;
  button.disabled = state.loadingSessions;
  button.textContent = state.loadingSessions
    ? 'Loading...'
    : `Load more (${state.sessions.length}/${state.sessionTotal})`;
}

async function runAnalysis() {
  if (!state.activeSession || state.analysisLoading) return;
  state.analysisLoading = true;
  renderAnalysisLoading();
  const templateId = selectedAnalysisTemplate();
  const llmId = selectedAnalysisLlm();
  const customPrompt = $('analysis-prompt')?.value || '';
  try {
    const res = await fetch('/api/session/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: state.activeSession.provider,
        id: state.activeSession.id,
        templateId,
        llmId,
        customPrompt,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const savedAt = saveAnalysisToCache(data, { templateId, llmId, customPrompt });
    finishAnalysisProgress('done');
    renderAnalysis(data, savedAt ? { source: 'fresh', savedAt } : {});
  } catch (err) {
    renderAnalysisError(err.message || String(err));
  } finally {
    state.analysisLoading = false;
    renderAnalysisButton();
  }
}

function selectedAnalysisTemplate() {
  return $('analysis-template')?.value || 'time-diagnosis';
}

function selectedAnalysisLlm() {
  return $('analysis-llm')?.value || 'claude-p';
}

function analysisCacheKey(session = state.activeSession, templateId = selectedAnalysisTemplate()) {
  if (!session?.provider || !session?.id || !templateId) return '';
  return [
    'agent-session-viewer',
    'analysis',
    'v1',
    encodeURIComponent(session.provider),
    encodeURIComponent(session.id),
    encodeURIComponent(templateId),
  ].join(':');
}

function saveAnalysisToCache(data, meta = {}) {
  const key = analysisCacheKey();
  if (!key) return '';
  const savedAt = new Date().toISOString();
  const payload = {
    savedAt,
    templateId: meta.templateId || data.templateId || selectedAnalysisTemplate(),
    llmId: meta.llmId || data.llmId || selectedAnalysisLlm(),
    customPrompt: meta.customPrompt || '',
    session: state.activeSession,
    data,
  };
  try {
    localStorage.setItem(key, JSON.stringify(payload));
    if (state.activeSession) {
      state.analyzedSessionKeys.add(sessionKey(state.activeSession));
      renderSessionList();
    }
    return savedAt;
  } catch {
    setAnalysisCacheNote('Analysis rendered, but local save failed.');
    return '';
  }
}

function restoreAnalysis() {
  const key = analysisCacheKey();
  if (!key) {
    clearAnalysis();
    return;
  }
  let payload = null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      clearAnalysis();
      return;
    }
    payload = JSON.parse(raw);
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
    clearAnalysis('Saved analysis could not be read.');
    return;
  }

  if ($('analysis-prompt')) $('analysis-prompt').value = payload.customPrompt || '';
  clearAnalysisProgress();
  renderAnalysis(payload.data, { source: 'cache', savedAt: payload.savedAt });
}

function renderAnalysis(data, options = {}) {
  state.analysisCurrent = data;
  const result = data.result || {};
  const duration = result.duration || {};
  const segments = result.topDelaySegments || [];
  const causes = result.rootCauses || [];
  const unknowns = result.unknowns || [];
  const checks = data.localChecks || {};
  $('analysis-result').innerHTML = `
    ${renderDiagnosisHero(result, checks)}
    <div class="analysis-kpis">
      <div><span>Total</span><b>${escapeHtml(formatDuration(duration.totalMs))}</b></div>
      <div><span>Active</span><b>${escapeHtml(formatDuration(duration.activeMs))}</b></div>
      <div><span>Idle</span><b>${escapeHtml(formatDuration(duration.idleMs))}</b></div>
    </div>
    ${checks.fallbackUsed ? '<div class="analysis-warning">Local fallback used</div>' : ''}
    ${renderDelayTimeline(segments)}
    ${renderRootCauses(causes)}
    ${renderAnalysisList('Unknowns', unknowns)}
  `;
  if (options.source === 'cache') {
    setAnalysisCacheNote(`Restored saved report ${shortSavedTime(options.savedAt)}.`);
  } else if (options.source === 'fresh') {
    setAnalysisCacheNote(`Saved locally ${shortSavedTime(options.savedAt)}.`);
  }
  renderAnalysisActions();
}

function renderDiagnosisHero(result, checks) {
  const primary = (result.topDelaySegments || [])[0] || null;
  const rootCause = (result.rootCauses || [])[0] || null;
  const title = primary
    ? `${delayCategoryLabel(primary.category)} · ${formatDuration(primary.durationMs)}`
    : rootCause?.cause || 'No dominant delay found';
  const confidence = result.confidence || primary?.confidence || 'unknown';
  const summary = result.summary || 'No analysis summary.';
  return `
    <section class="diagnosis-hero">
      <div class="diagnosis-eyebrow">Primary Diagnosis</div>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(summary)}</p>
      <div class="diagnosis-meta">
        <span>confidence ${escapeHtml(confidence)}</span>
        <span>${checks.schemaValid === false ? 'schema warning' : 'schema valid'}</span>
        <span>${checks.fallbackUsed ? 'local fallback' : 'llm structured'}</span>
      </div>
      ${primary ? renderEvidenceButtons(primary.evidenceTurnIds) : ''}
    </section>
  `;
}

function renderDelayTimeline(segments) {
  const items = (segments || []).filter(Boolean).slice(0, 6);
  if (!items.length) return '';
  return `
    <div class="delay-timeline">
      <h4>Delay Timeline</h4>
      ${items.map((segment, index) => `
        <article class="delay-segment">
          <div class="delay-index">${index + 1}</div>
          <div class="delay-content">
            <div class="delay-row">
              <strong>${escapeHtml(delayCategoryLabel(segment.category))}</strong>
              <b>${escapeHtml(formatDuration(segment.durationMs))}</b>
            </div>
            <p>${escapeHtml(segment.explanation || '')}</p>
            <div class="delay-meta">
              <span>${escapeHtml(segment.confidence || 'unknown')} confidence</span>
              ${renderEvidenceButtons(segment.evidenceTurnIds)}
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderRootCauses(causes) {
  const items = (causes || []).filter(Boolean).slice(0, 4);
  if (!items.length) return '';
  return `
    <div class="analysis-list root-causes">
      <h4>Root Causes</h4>
      <ul>
        ${items.map((cause) => `
          <li>
            <strong>${escapeHtml(cause.cause || 'Cause')}</strong>
            <span>${escapeHtml(cause.recommendation || '')}</span>
            ${renderEvidenceButtons(cause.evidenceTurnIds)}
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

function renderEvidenceButtons(ids) {
  const refs = (ids || []).filter(Boolean).slice(0, 4);
  if (!refs.length) return '';
  return `
    <div class="evidence-actions">
      ${refs.map((ref) => `
        <button class="evidence-jump" type="button" data-evidence-ref="${escapeHtml(ref)}">
          ${escapeHtml(shortEvidenceRef(ref))}
        </button>
      `).join('')}
    </div>
  `;
}

function delayCategoryLabel(category) {
  return String(category || 'unknown')
    .split('_')
    .map((part) => part ? part[0].toUpperCase() + part.slice(1) : '')
    .join(' ');
}

function shortEvidenceRef(ref) {
  const text = String(ref || '');
  if (text.length <= 18) return text;
  return '...' + text.slice(-15);
}

function renderAnalysisList(title, items) {
  const filtered = (items || []).filter(Boolean).slice(0, 6);
  if (!filtered.length) return '';
  return `
    <div class="analysis-list">
      <h4>${escapeHtml(title)}</h4>
      <ul>${filtered.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>
  `;
}

function renderAnalysisLoading() {
  state.analysisCurrent = null;
  startAnalysisProgress();
  renderAnalysisButton();
  renderAnalysisActions();
  setAnalysisCacheNote('');
  $('analysis-result').innerHTML = '<div class="dim">Waiting for structured report...</div>';
}

function renderAnalysisError(message) {
  state.analysisCurrent = null;
  finishAnalysisProgress('error');
  renderAnalysisActions();
  setAnalysisCacheNote('');
  $('analysis-result').innerHTML = `<pre class="error">${escapeHtml(message)}</pre>`;
}

function clearAnalysis(message = '') {
  state.analysisCurrent = null;
  clearAnalysisProgress();
  const result = $('analysis-result');
  if (result) result.innerHTML = message ? `<div class="dim">${escapeHtml(message)}</div>` : '';
  setAnalysisCacheNote('');
  renderAnalysisButton();
  renderAnalysisActions();
}

function clearSavedAnalysis() {
  const key = analysisCacheKey();
  if (key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  clearAnalysis('Analysis report cleared.');
}

function renderAnalysisButton() {
  const button = $('run-analysis');
  if (!button) return;
  button.disabled = state.analysisLoading || !state.activeSession || state.active === 'recap';
  button.textContent = state.analysisLoading ? 'Analyzing...' : 'Analyze';
}

function startAnalysisProgress() {
  clearAnalysisProgressTimer();
  state.analysisStartedAt = Date.now();
  state.analysisStageIndex = 0;
  state.analysisProgressStatus = 'running';
  renderAnalysisProgress();
  state.analysisProgressTimer = setInterval(() => {
    const elapsed = Date.now() - state.analysisStartedAt;
    const maxRunningStage = Math.max(0, ANALYSIS_STAGES.length - 2);
    state.analysisStageIndex = Math.min(maxRunningStage, Math.floor(elapsed / ANALYSIS_STAGE_INTERVAL_MS));
    renderAnalysisProgress();
  }, 500);
}

function finishAnalysisProgress(status = 'done') {
  clearAnalysisProgressTimer();
  state.analysisProgressStatus = status;
  if (status === 'done') state.analysisStageIndex = ANALYSIS_STAGES.length - 1;
  renderAnalysisProgress();
}

function clearAnalysisProgressTimer() {
  if (state.analysisProgressTimer) clearInterval(state.analysisProgressTimer);
  state.analysisProgressTimer = null;
}

function clearAnalysisProgress() {
  clearAnalysisProgressTimer();
  state.analysisStartedAt = null;
  state.analysisStageIndex = 0;
  state.analysisProgressStatus = 'idle';
  const progress = $('analysis-progress');
  if (progress) progress.innerHTML = '';
}

function renderAnalysisProgress() {
  const progress = $('analysis-progress');
  if (!progress || state.analysisProgressStatus === 'idle' || !state.analysisStartedAt) return;
  const elapsed = formatElapsed(Date.now() - state.analysisStartedAt);
  const statusLabel = state.analysisProgressStatus === 'error'
    ? 'Stopped'
    : state.analysisProgressStatus === 'done'
      ? 'Completed'
      : 'Running';
  progress.innerHTML = `
    <div class="analysis-progress-head">
      <span>${escapeHtml(statusLabel)}</span>
      <b>${escapeHtml(elapsed)}</b>
    </div>
    <ol>
      ${ANALYSIS_STAGES.map(([title, detail], index) => `
        <li class="analysis-step ${escapeHtml(analysisStepState(index))}">
          <span class="analysis-step-dot"></span>
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(detail)}</span>
          </div>
        </li>
      `).join('')}
    </ol>
  `;
}

function analysisStepState(index) {
  if (state.analysisProgressStatus === 'done') return 'done';
  if (state.analysisProgressStatus === 'error' && index === state.analysisStageIndex) return 'error';
  if (index < state.analysisStageIndex) return 'done';
  if (index === state.analysisStageIndex) return 'current';
  return 'pending';
}

function formatElapsed(ms) {
  const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${remainder}s`;
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

function renderAnalysisActions() {
  const hasReport = Boolean(state.analysisCurrent);
  const copy = $('copy-analysis');
  const clear = $('clear-analysis');
  let hasSaved = false;
  const key = analysisCacheKey();
  if (key) {
    try {
      hasSaved = Boolean(localStorage.getItem(key));
    } catch {
      hasSaved = false;
    }
  }
  if (copy) copy.disabled = !hasReport;
  if (clear) clear.disabled = !hasReport && !hasSaved;
}

function setAnalysisCacheNote(message) {
  const note = $('analysis-cache-note');
  if (note) note.textContent = message || '';
}

function shortSavedTime(ts) {
  if (!ts) return '';
  return shortTime(ts);
}

function analysisToMarkdown(data = state.analysisCurrent) {
  if (!data) return '';
  const result = data.result || {};
  const duration = result.duration || {};
  const session = state.activeSession || {};
  const lines = [
    '# Agent Session Analysis',
    '',
    `- Session: ${markdownLine(session.title || session.id || '-')}`,
    `- Provider: ${markdownLine(formatProviderLabel(session.provider))}`,
    `- Template: ${markdownLine(data.templateId || selectedAnalysisTemplate())}`,
    `- LLM: ${markdownLine(data.llmId || selectedAnalysisLlm())}`,
    '',
    '## Summary',
    markdownLine(result.summary || 'No analysis summary.'),
    '',
    '## Duration',
    `- Total: ${formatDuration(duration.totalMs)}`,
    `- Active: ${formatDuration(duration.activeMs)}`,
    `- Idle: ${formatDuration(duration.idleMs)}`,
    '',
  ];

  appendMarkdownList(lines, 'Delay Segments', result.topDelaySegments, (segment) => {
    const evidence = (segment.evidenceTurnIds || []).join(', ');
    return [
      `${segment.category || 'segment'}: ${formatDuration(segment.durationMs)}`,
      segment.explanation || '',
      evidence ? `evidence: ${evidence}` : '',
    ].filter(Boolean).join(' - ');
  });

  appendMarkdownList(lines, 'Root Causes', result.rootCauses, (cause) => [
    cause.cause || 'cause',
    cause.recommendation || '',
    (cause.evidenceTurnIds || []).length ? `evidence: ${cause.evidenceTurnIds.join(', ')}` : '',
  ].filter(Boolean).join(' - '));

  appendMarkdownList(lines, 'Unknowns', result.unknowns, (item) => item);

  const checks = data.localChecks || {};
  lines.push('## Local Checks');
  lines.push(`- Fallback used: ${checks.fallbackUsed ? 'yes' : 'no'}`);
  lines.push(`- Schema valid: ${checks.schemaValid === false ? 'no' : 'yes'}`);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function appendMarkdownList(lines, title, items, formatter) {
  const filtered = (items || []).filter(Boolean).slice(0, 8);
  lines.push(`## ${title}`);
  if (!filtered.length) {
    lines.push('- None');
    lines.push('');
    return;
  }
  for (const item of filtered) {
    lines.push(`- ${markdownLine(formatter(item))}`);
  }
  lines.push('');
}

function markdownLine(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

async function copyAnalysisMarkdown() {
  const markdown = analysisToMarkdown();
  if (!markdown) return;
  await writeClipboard(markdown);
  const button = $('copy-analysis');
  if (!button) return;
  button.textContent = 'Copied';
  setTimeout(() => {
    button.textContent = 'Copy Markdown';
  }, 1200);
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function jumpToEvidence(turnId) {
  const el = document.getElementById(turnElementId(turnId));
  if (!el) {
    setAnalysisCacheNote(`Evidence turn not loaded: ${turnId}`);
    return;
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelectorAll('.turn.evidence-active').forEach((turn) => {
    turn.classList.remove('evidence-active');
  });
  el.classList.add('evidence-active');
  setTimeout(() => {
    el.classList.remove('evidence-active');
  }, 2400);
}

function formatDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return '-';
  const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

$('provider-filter').addEventListener('change', async (event) => {
  state.providerFilter = event.target.value;
  state.active = null;
  state.activeSession = null;
  state.lastRefreshAt = null;
  state.refreshError = '';
  state.sessions = [];
  state.sessionTotal = 0;
  state.hasMoreSessions = false;
  renderRefreshStatus();
  await loadSessions({ reset: true });
});

$('filter').addEventListener('input', (event) => {
  state.filter = event.target.value;
  renderSessionList();
});

$('toggle-sidebar').addEventListener('click', () => {
  toggleSidebar();
});

$('toggle-detail-rail').addEventListener('click', () => {
  toggleDetailRail();
});

$('refresh-sessions').addEventListener('click', () => {
  refreshSources().catch((err) => {
    state.refreshError = err.stack || String(err);
    renderRefreshStatus();
  });
});

$('load-more-sessions').addEventListener('click', () => {
  loadSessions({ append: true }).catch((err) => {
    state.refreshError = err.stack || String(err);
    renderRefreshStatus();
  });
});

$('recap-btn').addEventListener('click', () => {
  loadRecap().catch((err) => showRecapError(err.stack || String(err)));
});

$('auto-refresh-toggle').addEventListener('change', (event) => {
  state.autoRefresh = event.target.checked;
  renderRefreshStatus();
});

$('refresh-interval').addEventListener('change', (event) => {
  state.refreshIntervalMs = Number(event.target.value) || DEFAULT_REFRESH_INTERVAL_MS;
  startRefreshTimer();
  renderRefreshStatus();
});

$('refresh-now').addEventListener('click', () => {
  refreshActiveSession().catch((err) => {
    state.refreshError = err.stack || String(err);
    renderRefreshStatus();
  });
});

$('run-analysis').addEventListener('click', () => {
  runAnalysis().catch((err) => renderAnalysisError(err.stack || String(err)));
});

$('analysis-template').addEventListener('change', () => {
  restoreAnalysis();
});

$('copy-analysis').addEventListener('click', () => {
  copyAnalysisMarkdown().catch((err) => renderAnalysisError(err.stack || String(err)));
});

$('clear-analysis').addEventListener('click', () => {
  clearSavedAnalysis();
});

$('analysis-result').addEventListener('click', (event) => {
  const button = event.target.closest('.evidence-jump');
  if (!button) return;
  jumpToEvidence(button.dataset.evidenceRef || '');
});

$('copy-recap').addEventListener('click', async () => {
  if (!state.recapMarkdown) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(state.recapMarkdown);
    $('copy-recap').textContent = 'Copied';
    setTimeout(() => {
      $('copy-recap').textContent = 'Copy Markdown';
    }, 1200);
  }
});

init().catch((err) => {
  showError({ id: 'startup' }, err.stack || String(err));
});

startRefreshTimer();
