const $ = (id) => document.getElementById(id);

const state = {
  providers: [],
  sessions: [],
  providerFilter: 'all',
  filter: '',
  active: null,
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

function shortTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function init() {
  await loadProviders();
  await loadSessions();
}

async function loadProviders() {
  const res = await fetch('/api/providers');
  const data = await res.json();
  state.providers = data.providers || [];

  const filter = $('provider-filter');
  for (const provider of state.providers) {
    const opt = document.createElement('option');
    opt.value = provider.id;
    opt.textContent = provider.label || provider.id;
    filter.appendChild(opt);
  }

  $('provider-roots').innerHTML = state.providers
    .map((p) => `<div><b>${escapeHtml(p.id)}</b> ${escapeHtml(p.rootDir || '')}</div>`)
    .join('');
}

async function loadSessions() {
  const provider = encodeURIComponent(state.providerFilter);
  const res = await fetch('/api/sessions?provider=' + provider);
  const data = await res.json();
  state.sessions = data.sessions || [];
  renderSessionList();
}

function renderSessionList() {
  const q = state.filter.toLowerCase();
  const sessions = state.sessions.filter((s) => {
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

  const list = $('session-list');
  list.innerHTML = '';
  if (!sessions.length) {
    const empty = document.createElement('div');
    empty.className = 'list-empty';
    empty.textContent = 'No sessions found.';
    list.appendChild(empty);
    return;
  }

  for (const session of sessions) {
    list.appendChild(renderSessionItem(session));
  }
}

function renderSessionItem(session) {
  const item = document.createElement('button');
  item.className = 'session-item' + (isActive(session) ? ' active' : '');
  item.type = 'button';

  const summary = session.summary || {};
  item.innerHTML = `
    <div class="si-row">
      <span class="provider ${escapeHtml(session.provider)}">${escapeHtml(session.provider)}</span>
      <span class="si-title">${escapeHtml(session.title || session.id)}</span>
    </div>
    <div class="si-project">${escapeHtml(session.project || '')}</div>
    <div class="si-meta">
      <span>${summary.turns || 0} turns</span>
      <span>${fmtTokens((summary.inputTokens || 0) + (summary.outputTokens || 0))} tok</span>
      <span class="cost">${fmtCost(summary.costUSD)}</span>
      <span>${shortTime(session.updatedAt)}</span>
    </div>
  `;
  item.addEventListener('click', () => loadSession(session));
  return item;
}

async function loadSession(session) {
  state.active = `${session.provider}:${session.id}`;
  renderSessionList();
  showLoading(session);

  const params = new URLSearchParams({
    provider: session.provider,
    id: session.id,
  });
  const res = await fetch('/api/session?' + params.toString());
  if (!res.ok) {
    showError(session, await res.text());
    return;
  }
  renderSession(await res.json());
}

function showLoading(session) {
  $('empty').hidden = true;
  $('session-view').hidden = false;
  $('session-title').textContent = session.title || session.id;
  $('session-meta').textContent = 'loading...';
  $('session-totals').innerHTML = '';
  $('session-context').innerHTML = '';
  $('turns').innerHTML = '<div class="loading">loading session...</div>';
}

function showError(session, message) {
  $('empty').hidden = true;
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

function renderSession(data) {
  const session = data.session;
  const summary = session.summary || {};

  $('empty').hidden = true;
  $('session-view').hidden = false;
  $('session-title').innerHTML = `
    <span class="provider ${escapeHtml(session.provider)}">${escapeHtml(session.provider)}</span>
    <span>${escapeHtml(session.title || session.id)}</span>
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

  const turns = $('turns');
  turns.innerHTML = '';
  for (const turn of data.turns || []) {
    turns.appendChild(renderTurn(turn));
  }
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
  return state.active === `${session.provider}:${session.id}`;
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
  await loadSessions();
});

$('filter').addEventListener('input', (event) => {
  state.filter = event.target.value;
  renderSessionList();
});

init().catch((err) => {
  showError({ id: 'startup' }, err.stack || String(err));
});

setInterval(loadSessions, 30_000);
