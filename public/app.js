const $ = (id) => document.getElementById(id);
const SESSION_PAGE_SIZE = 20;
const SESSION_TURN_LIMIT = 200;
const EVIDENCE_TURN_WINDOW_SIZE = 500;
const TURN_SCROLL_LOAD_THRESHOLD_PX = 160;
const TURN_WINDOW_CACHE_LIMIT = 600;
const ANALYSIS_STAGE_INTERVAL_MS = 1400;
const LANGUAGE_KEY = 'runwhy:language:v1';
const TURN_PREFERENCES_KEY = 'runwhy:turns:v1';
const LONG_GAP_THRESHOLD_MS = 60_000;
const TURN_KIND_FILTERS = new Set(['all', 'user', 'assistant', 'reasoning', 'tool_call', 'tool_result', 'hook', 'compacted']);
const SUPPORTED_LANGUAGES = new Set(['en', 'zh-CN']);
const TRANSLATIONS = {
  en: {
    'app.subtitle': 'Agent flight recorder',
    'control.language': 'Language',
    'control.providerFilter': 'provider filter',
    'provider.all': 'All providers',
    'provider.default': 'Provider',
    'provider.none': 'No providers',
    'provider.configure': 'Run with --demo or configure local roots.',
    'search.placeholder': 'Search sessions...',
    'action.resumeWork': 'Resume Work',
    'action.generating': 'Generating...',
    'action.loadMore': 'Load more',
    'action.loading': 'Loading...',
    'action.copyMarkdown': 'Copy Markdown',
    'action.copied': 'Copied',
    'action.clear': 'Clear',
    'action.analyze': 'Analyze',
    'action.analyzing': 'Analyzing...',
    'action.expand': 'Expand',
    'action.collapse': 'Collapse',
    'label.last': 'Last',
    'label.days': 'Days',
    'label.daysUnit': 'days',
    'label.recapDays': 'recap days',
    'settings.title': 'Settings',
    'settings.provider': 'Provider',
    'settings.language': 'Language',
    'nav.sessions': 'Sessions',
    'nav.sources': 'Sources',
    'nav.local': 'Local',
    'nav.primary': 'primary',
    'layout.collapseSidebar': 'Collapse sidebar',
    'layout.expandSidebar': 'Expand sidebar',
    'layout.toggleSidebar': 'Toggle sidebar',
    'layout.collapseDetails': 'Collapse details',
    'layout.expandDetails': 'Expand details',
    'layout.toggleDetails': 'Toggle details',
    'empty.title': 'No session selected',
    'empty.copy': 'Select a session or generate a work recap from the top bar.',
    'recap.eyebrow': 'Recap',
    'recap.title': 'Pick Up Where I Left Off',
    'recap.rangeTitle': 'Work recap range',
    'recap.loading': 'generating recap...',
    'recap.noItems': 'No items found.',
    'recap.sessions': 'sessions',
    'recap.projects': 'projects',
    'recap.since': 'since {time}',
    'rail.details': 'Details',
    'rail.properties': 'Properties',
    'rail.format': 'Format',
    'rail.markdown': 'Markdown',
    'rail.recommended': 'Recommended',
    'rail.redaction': 'Strict redaction',
    'rail.use': 'Use',
    'rail.useTargets': 'Issue, PR, new agent',
    'rail.cliExport': 'CLI export can produce a focused single-session handoff.',
    'rail.inspector': 'Inspector',
    'rail.metrics': 'Metrics',
    'rail.context': 'Context',
    'turn.type': 'Type',
    'turn.typeFilter': 'turn type filter',
    'turn.turns': 'turns',
    'turn.gap': 'gap',
    'turn.window': 'Loaded turns {start}-{end} of {total}. Filters apply to loaded turns only.',
    'turn.windowSparse': 'Loaded {loaded} of {total} turns across {windows} windows. Filters apply to loaded turns only.',
    'turn.windowComplete': 'Loaded all {total} turns.',
    'turn.noMatch': 'No turns match the selected type in the current loaded window.',
    'turn.search': 'Search',
    'turn.searchPlaceholder': 'Search turns...',
    'turn.searchLoading': 'Searching turns...',
    'turn.searchNoResults': 'No matching turns.',
    'turn.searchError': 'Search failed.',
    'turn.searchCount': '{count} matching turns',
    'turn.loadingOlder': 'Loading older turns...',
    'turn.toolCall': 'Tool call',
    'turn.toolResult': 'Tool result',
    'turn.hook': 'Hook',
    'turn.details': 'Details',
    'turn.noPayload': 'No payload',
    'session.controls': 'session view controls',
    'session.noFound': 'No sessions found',
    'session.adjustFilter': 'Adjust the provider or filter.',
    'session.range': 'Showing {shown} of {total} indexed sessions.',
    'session.rangeFiltered': 'Showing {shown} of {total} matching sessions. Search runs across indexed sessions.',
    'session.loadingRange': 'Loading sessions...',
    'session.noTimestamp': 'No timestamp',
    'session.unknownDate': 'Unknown date',
    'session.loading': 'loading...',
    'session.loadingBody': 'loading session...',
    'session.error': 'error',
    'session.selectLoaded': 'Select a loaded session to analyze.',
    'session.analyzed': 'Analyzed',
    'session.long': 'Long',
    'session.model': 'model',
    'metric.cost': 'Cost',
    'metric.turns': 'Turns',
    'metric.input': 'Input',
    'metric.output': 'Output',
    'metric.cacheRead': 'Cache read',
    'metric.cacheWrite': 'Cache write',
    'analysis.title': 'Analysis',
    'analysis.template': 'analysis template',
    'analysis.llm': 'analysis llm',
    'analysis.focusPlaceholder': 'Focus...',
    'analysis.customFocus': 'custom analysis focus',
    'analysis.waiting': 'Waiting for structured report...',
    'analysis.cleared': 'Analysis report cleared.',
    'analysis.savedFailed': 'Analysis rendered, but local save failed.',
    'analysis.restored': 'Restored saved report {time}.',
    'analysis.saved': 'Saved locally {time}.',
    'analysis.evidenceMissing': 'Evidence turn not loaded: {id}',
    'analysis.evidenceLoading': 'Loading evidence turn {id}...',
    'analysis.primaryDiagnosis': 'Primary Diagnosis',
    'analysis.noDominantDelay': 'No dominant delay found',
    'analysis.noSummary': 'No analysis summary.',
    'analysis.confidence': 'confidence',
    'analysis.schemaWarning': 'schema warning',
    'analysis.schemaValid': 'schema valid',
    'analysis.localFallback': 'local fallback',
    'analysis.llmStructured': 'llm structured',
    'analysis.delayTimeline': 'Delay Timeline',
    'analysis.rootCauses': 'Root Causes',
    'analysis.unknowns': 'Unknowns',
    'analysis.cause': 'Cause',
    'analysis.fallbackUsed': 'Local fallback used',
    'analysis.stage.running': 'Running',
    'analysis.stage.completed': 'Completed',
    'analysis.stage.stopped': 'Stopped',
    'analysis.stage.request.title': 'Request',
    'analysis.stage.request.detail': 'Session, template, and focus prepared.',
    'analysis.stage.evidence.title': 'Evidence',
    'analysis.stage.evidence.detail': 'Building redacted turn evidence and trusted timing metrics.',
    'analysis.stage.prompt.title': 'Prompt',
    'analysis.stage.prompt.detail': 'Assembling guarded prompt with local checks.',
    'analysis.stage.llm.title': 'LLM',
    'analysis.stage.llm.detail': 'Running selected headless model adapter.',
    'analysis.stage.validate.title': 'Validate',
    'analysis.stage.validate.detail': 'Checking structured output and evidence references.',
    'analysis.stage.save.title': 'Save',
    'analysis.stage.save.detail': 'Rendering report and saving local share copy.',
  },
  'zh-CN': {
    'app.subtitle': 'Agent 会话记录器',
    'control.language': '语言',
    'control.providerFilter': '来源筛选',
    'provider.all': '全部来源',
    'provider.default': '来源',
    'provider.none': '暂无来源',
    'provider.configure': '使用 --demo 启动，或配置本地会话目录。',
    'search.placeholder': '搜索会话...',
    'action.resumeWork': '继续工作',
    'action.generating': '生成中...',
    'action.loadMore': '加载更多',
    'action.loading': '加载中...',
    'action.copyMarkdown': '复制 Markdown',
    'action.copied': '已复制',
    'action.clear': '清除',
    'action.analyze': '分析',
    'action.analyzing': '分析中...',
    'action.expand': '展开',
    'action.collapse': '收起',
    'label.last': '最近',
    'label.days': '天数',
    'label.daysUnit': '天',
    'label.recapDays': '回顾天数',
    'settings.title': '设置',
    'settings.provider': '来源',
    'settings.language': '语言',
    'nav.sessions': '会话',
    'nav.sources': '来源',
    'nav.local': '本地',
    'nav.primary': '主导航',
    'layout.collapseSidebar': '收起侧栏',
    'layout.expandSidebar': '展开侧栏',
    'layout.toggleSidebar': '切换侧栏',
    'layout.collapseDetails': '收起详情',
    'layout.expandDetails': '展开详情',
    'layout.toggleDetails': '切换详情',
    'empty.title': '未选择会话',
    'empty.copy': '选择一个会话，或从顶部生成工作回顾。',
    'recap.eyebrow': '回顾',
    'recap.title': '继续上次工作',
    'recap.rangeTitle': '工作回顾范围',
    'recap.loading': '正在生成回顾...',
    'recap.noItems': '暂无内容。',
    'recap.sessions': '个会话',
    'recap.projects': '个项目',
    'recap.since': '自 {time}',
    'rail.details': '详情',
    'rail.properties': '属性',
    'rail.format': '格式',
    'rail.markdown': 'Markdown',
    'rail.recommended': '建议',
    'rail.redaction': '严格脱敏',
    'rail.use': '用途',
    'rail.useTargets': 'Issue、PR、新代理',
    'rail.cliExport': 'CLI 导出可生成聚焦的单会话交接内容。',
    'rail.inspector': '检查器',
    'rail.metrics': '指标',
    'rail.context': '上下文',
    'turn.type': '类型',
    'turn.typeFilter': '回合类型筛选',
    'turn.turns': '轮',
    'turn.gap': '间隔',
    'turn.window': '已加载第 {start}-{end} / {total} 轮，筛选仅作用于已加载窗口。',
    'turn.windowSparse': '已加载 {loaded} / {total} 轮，分布在 {windows} 个窗口；筛选仅作用于已加载窗口。',
    'turn.windowComplete': '已加载全部 {total} 轮。',
    'turn.noMatch': '当前加载窗口中没有匹配该类型的回合。',
    'turn.search': '搜索',
    'turn.searchPlaceholder': '搜索回合...',
    'turn.searchLoading': '正在搜索回合...',
    'turn.searchNoResults': '未找到匹配回合。',
    'turn.searchError': '搜索失败。',
    'turn.searchCount': '{count} 个匹配回合',
    'turn.loadingOlder': '正在加载更早回合...',
    'turn.toolCall': '工具调用',
    'turn.toolResult': '工具结果',
    'turn.hook': 'Hook',
    'turn.details': '详情',
    'turn.noPayload': '无内容',
    'session.controls': '会话视图控制',
    'session.noFound': '未找到会话',
    'session.adjustFilter': '请调整来源或筛选条件。',
    'session.range': '已显示 {shown} / {total} 个已索引会话。',
    'session.rangeFiltered': '已显示 {shown} / {total} 个匹配会话，搜索作用于全部已索引会话。',
    'session.loadingRange': '正在加载会话...',
    'session.noTimestamp': '无时间戳',
    'session.unknownDate': '未知日期',
    'session.loading': '加载中...',
    'session.loadingBody': '正在加载会话...',
    'session.error': '错误',
    'session.selectLoaded': '请选择已加载的会话进行分析。',
    'session.analyzed': '已分析',
    'session.long': '长会话',
    'session.model': '模型',
    'metric.cost': '成本',
    'metric.turns': '轮次',
    'metric.input': '输入',
    'metric.output': '输出',
    'metric.cacheRead': '缓存读',
    'metric.cacheWrite': '缓存写',
    'analysis.title': '分析',
    'analysis.template': '分析模板',
    'analysis.llm': '分析模型',
    'analysis.focusPlaceholder': '关注点...',
    'analysis.customFocus': '自定义分析关注点',
    'analysis.waiting': '等待结构化报告...',
    'analysis.cleared': '分析报告已清除。',
    'analysis.savedFailed': '分析已渲染，但本地保存失败。',
    'analysis.restored': '已恢复本地报告 {time}。',
    'analysis.saved': '已本地保存 {time}。',
    'analysis.evidenceMissing': '证据回合未加载：{id}',
    'analysis.evidenceLoading': '正在加载证据回合：{id}',
    'analysis.primaryDiagnosis': '主要诊断',
    'analysis.noDominantDelay': '未发现主要延迟',
    'analysis.noSummary': '暂无分析摘要。',
    'analysis.confidence': '置信度',
    'analysis.schemaWarning': '结构警告',
    'analysis.schemaValid': '结构有效',
    'analysis.localFallback': '本地兜底',
    'analysis.llmStructured': 'LLM 结构化',
    'analysis.delayTimeline': '延迟时间线',
    'analysis.rootCauses': '根因',
    'analysis.unknowns': '未知项',
    'analysis.cause': '原因',
    'analysis.fallbackUsed': '使用了本地兜底',
    'analysis.stage.running': '运行中',
    'analysis.stage.completed': '已完成',
    'analysis.stage.stopped': '已停止',
    'analysis.stage.request.title': '请求',
    'analysis.stage.request.detail': '会话、模板和关注点已准备。',
    'analysis.stage.evidence.title': '证据',
    'analysis.stage.evidence.detail': '构建脱敏回合证据和可信时间指标。',
    'analysis.stage.prompt.title': '提示词',
    'analysis.stage.prompt.detail': '基于本地检查组装受保护提示词。',
    'analysis.stage.llm.title': '模型',
    'analysis.stage.llm.detail': '运行选定的无头模型适配器。',
    'analysis.stage.validate.title': '校验',
    'analysis.stage.validate.detail': '检查结构化输出和证据引用。',
    'analysis.stage.save.title': '保存',
    'analysis.stage.save.detail': '渲染报告并保存本地共享副本。',
  },
};
const ANALYSIS_STAGES = [
  ['analysis.stage.request.title', 'analysis.stage.request.detail'],
  ['analysis.stage.evidence.title', 'analysis.stage.evidence.detail'],
  ['analysis.stage.prompt.title', 'analysis.stage.prompt.detail'],
  ['analysis.stage.llm.title', 'analysis.stage.llm.detail'],
  ['analysis.stage.validate.title', 'analysis.stage.validate.detail'],
  ['analysis.stage.save.title', 'analysis.stage.save.detail'],
];

const state = {
  providers: [],
  sessions: [],
  sessionTotal: 0,
  sessionOffset: 0,
  hasMoreSessions: false,
  loadingSessions: false,
  sessionSearchTimer: null,
  providerFilter: 'all',
  filter: '',
  active: null,
  activeSession: null,
  activeSessionData: null,
  recapData: null,
  recapMarkdown: '',
  language: 'en',
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
  turnKindFilter: 'all',
  turnPageLoading: '',
  turnSearchQuery: '',
  turnSearchResults: [],
  turnSearchLoading: false,
  turnSearchError: '',
  turnSearchTimer: null,
  settingsOpen: false,
  recapOpen: false,
  analyzedSessionKeys: new Set(),
};

function t(key, vars = {}) {
  const dictionary = TRANSLATIONS[state.language] || TRANSLATIONS.en;
  const template = dictionary[key] || TRANSLATIONS.en[key] || key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}

function resolveLanguage(value) {
  if (SUPPORTED_LANGUAGES.has(value)) return value;
  if (String(value || '').toLowerCase().startsWith('zh')) return 'zh-CN';
  return 'en';
}

function restoreLanguage() {
  let stored = '';
  try {
    stored = localStorage.getItem(LANGUAGE_KEY) || '';
  } catch {}
  state.language = resolveLanguage(stored || navigator.language || 'en');
  applyLanguage();
}

function setLanguage(language) {
  const next = resolveLanguage(language);
  if (state.language === next) return;
  state.language = next;
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {}
  applyLanguage();
  renderProviderRoots();
  renderSessionList();
  renderSessionPaging();
  renderSessionRangeStatus();
  renderTurnControls();
  renderTurnSearchResults();
  renderAnalysisButton();
  renderTopbarPopovers();
  if (state.activeSessionData) renderSession(state.activeSessionData, { preserveScroll: true });
  if (state.active === 'recap' && state.recapData) renderRecap(state.recapData);
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.setAttribute('title', t(node.dataset.i18nTitle));
  });
  const switcher = $('language-switcher');
  if (switcher) switcher.value = state.language;
}

function toggleSettingsPopover() {
  state.settingsOpen = !state.settingsOpen;
  if (state.settingsOpen) state.recapOpen = false;
  renderTopbarPopovers();
}

function toggleRecapPopover() {
  state.recapOpen = !state.recapOpen;
  if (state.recapOpen) state.settingsOpen = false;
  renderTopbarPopovers();
}

function closeTopbarPopovers() {
  if (!state.settingsOpen && !state.recapOpen) return;
  state.settingsOpen = false;
  state.recapOpen = false;
  renderTopbarPopovers();
}

function renderTopbarPopovers() {
  const settings = $('settings-popover');
  const settingsButton = $('settings-button');
  const recap = $('recap-popover');
  const recapButton = $('recap-btn');
  if (settings) settings.hidden = !state.settingsOpen;
  if (settingsButton) settingsButton.setAttribute('aria-expanded', String(state.settingsOpen));
  if (recap) recap.hidden = !state.recapOpen;
  if (recapButton) recapButton.setAttribute('aria-expanded', String(state.recapOpen));
}

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
  return provider || t('provider.default');
}

function shortTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFullDateTime(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join('-') + ' ' + [pad2(date.getHours()), pad2(date.getMinutes())].join(':');
}

function formatDateGroup(ts) {
  const full = formatFullDateTime(ts);
  return full ? full.slice(0, 10) : t('session.unknownDate');
}

function formatSessionRange(session) {
  const start = formatFullDateTime(session.createdAt);
  const end = formatFullDateTime(session.updatedAt);
  if (start && end && start !== end) return `${start} -> ${end}`;
  return end || start || t('session.noTimestamp');
}

function sessionDurationMs(session) {
  const start = Date.parse(session.createdAt || '');
  const end = Date.parse(session.updatedAt || '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

async function init() {
  restoreLanguage();
  restoreLayoutState();
  restoreTurnPreferences();
  await loadProviders();
  await loadAnalysisTemplates();
  await loadSessions({ reset: true });
}

async function loadProviders() {
  const res = await fetch('/api/providers');
  const data = await res.json();
  state.providers = data.providers || [];

  const filter = $('provider-filter');
  filter.innerHTML = `<option value="all" data-i18n="provider.all">${escapeHtml(t('provider.all'))}</option>`;
  for (const provider of state.providers) {
    const opt = document.createElement('option');
    opt.value = provider.id;
    opt.textContent = provider.label || formatProviderLabel(provider.id);
    filter.appendChild(opt);
  }

  renderProviderRoots();
  applyLanguage();
}

function renderProviderRoots() {
  $('provider-roots').innerHTML = state.providers.length
    ? state.providers
      .map((p) => `
        <div class="root-row">
          <span>${escapeHtml(formatProviderLabel(p.id))}</span>
          <code>${escapeHtml(p.rootDir || '')}</code>
        </div>
      `)
      .join('')
    : `<div class="root-row"><span>${escapeHtml(t('provider.none'))}</span><code>${escapeHtml(t('provider.configure'))}</code></div>`;
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
  renderSessionRangeStatus();
  renderSessionPaging();
  try {
    const params = new URLSearchParams({
      provider: state.providerFilter,
      limit: String(SESSION_PAGE_SIZE),
      offset: String(offset),
    });
    if (state.filter.trim()) params.set('q', state.filter.trim());
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
    renderSessionRangeStatus();
    renderSessionPaging();
  }
}

function filteredSessions() {
  return state.sessions;
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
    empty.innerHTML = `<strong>${escapeHtml(t('session.noFound'))}</strong><span>${escapeHtml(t('session.adjustFilter'))}</span>`;
    list.appendChild(empty);
    return;
  }

  let currentGroup = '';
  for (const session of sessions) {
    const group = formatDateGroup(session.updatedAt || session.createdAt);
    if (group !== currentGroup) {
      currentGroup = group;
      list.appendChild(renderSessionDateGroup(group));
    }
    list.appendChild(renderSessionItem(session));
  }
  renderSessionPaging();
  renderSessionRangeStatus();
}

function renderSessionRangeStatus() {
  const status = $('session-range-status');
  if (!status) return;
  if (state.loadingSessions && !state.sessions.length) {
    status.textContent = t('session.loadingRange');
    return;
  }
  const shown = state.sessions.length;
  const total = state.sessionTotal || shown;
  status.textContent = state.filter.trim()
    ? t('session.rangeFiltered', { shown, total })
    : t('session.range', { shown, total });
}

function renderSessionDateGroup(label) {
  const el = document.createElement('div');
  el.className = 'session-date-group';
  el.textContent = label;
  return el;
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
  const duration = sessionDurationMs(session);
  item.innerHTML = `
    <div class="si-row">
      <span class="provider ${escapeHtml(session.provider)}">${escapeHtml(formatProviderLabel(session.provider))}</span>
      <span class="si-title">${escapeHtml(session.title || session.id)}</span>
    </div>
    ${renderSessionChips(session)}
    <div class="si-project">${escapeHtml(project)}</div>
    <div class="si-time">${escapeHtml(formatSessionRange(session))}</div>
    <div class="si-meta">
      <span>${escapeHtml(formatDuration(duration))}</span>
      <span>${summary.turns || 0} ${escapeHtml(t('turn.turns'))}</span>
    </div>
  `;
  item.addEventListener('click', () => loadSession(session));
  return item;
}

function renderSessionChips(session) {
  const chips = [];
  const summary = session.summary || {};
  const key = sessionKey(session);
  chips.push(sessionStatusLabel(session));
  if (state.analyzedSessionKeys.has(key) || hasSavedAnalysis(session)) chips.push(t('session.analyzed'));
  if ((summary.turns || 0) >= 80) chips.push(t('session.long'));
  if (!chips.length) return '';
  return `
    <div class="session-chips">
      ${chips.slice(0, 3).map((chip, index) => `<span class="session-chip ${index === 0 ? `status-${escapeHtml(chip.toLowerCase())}` : ''}">${escapeHtml(chip)}</span>`).join('')}
    </div>
  `;
}

function sessionStatusLabel(session) {
  const status = String(session.status || '').toLowerCase();
  if (['running', 'active', 'in_progress', 'doing'].includes(status)) return 'DOING';
  if (['failed', 'error', 'blocked'].includes(status)) return 'BLOCKED';
  return 'DONE';
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

async function fetchSessionDetail(session, options = {}) {
  const params = new URLSearchParams({
    provider: session.provider,
    id: session.id,
    turnLimit: String(options.turnLimit || SESSION_TURN_LIMIT),
  });
  if (options.beforeTurn != null) params.set('beforeTurn', String(options.beforeTurn));
  if (options.turnId) params.set('turnId', options.turnId);
  const res = await fetch('/api/session?' + params.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchTurnWindow(session, options = {}) {
  const params = new URLSearchParams({
    provider: session.provider,
    id: session.id,
    limit: String(options.limit || SESSION_TURN_LIMIT),
  });
  if (options.anchor) params.set('anchor', options.anchor);
  if (options.beforeOrdinal != null) params.set('beforeOrdinal', String(options.beforeOrdinal));
  if (options.afterOrdinal != null) params.set('afterOrdinal', String(options.afterOrdinal));
  if (options.centerTurnId) params.set('centerTurnId', options.centerTurnId);
  if (options.centerOrdinal != null) params.set('centerOrdinal', String(options.centerOrdinal));
  if (options.before != null) params.set('before', String(options.before));
  if (options.after != null) params.set('after', String(options.after));
  const res = await fetch('/api/session/turns?' + params.toString());
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function searchSessionTurns(query) {
  if (!state.activeSession) return { hits: [] };
  const params = new URLSearchParams({
    provider: state.activeSession.provider,
    id: state.activeSession.id,
    q: query,
    limit: '50',
  });
  const res = await fetch('/api/session/search?' + params.toString());
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
  state.activeSessionData = null;
  resetTurnSearch();
  renderSessionList();
  if (!silent) showLoading(session);

  try {
    renderSession(await fetchSessionDetail(session), { preserveScroll: silent });
  } catch (err) {
    showError(session, err.message || String(err));
  }
}

async function loadTurnsAround(turnId) {
  if (!state.activeSession || state.turnPageLoading) return false;
  state.turnPageLoading = 'evidence';
  renderTurnControls();
  setAnalysisCacheNote(t('analysis.evidenceLoading', { id: turnId }));
  try {
    const before = Math.floor(EVIDENCE_TURN_WINDOW_SIZE / 2);
    const page = await fetchTurnWindow(state.activeSession, {
      limit: EVIDENCE_TURN_WINDOW_SIZE,
      centerTurnId: turnId,
      before,
      after: EVIDENCE_TURN_WINDOW_SIZE - before - 1,
    });
    if (page.target?.found === false) {
      setAnalysisCacheNote(t('analysis.evidenceMissing', { id: turnId }));
      return false;
    }
    renderSession(mergeTurnWindow(state.activeSessionData, page), { preserveScroll: true });
    setAnalysisCacheNote('');
    return true;
  } catch (err) {
    setAnalysisCacheNote(err.message || String(err));
    return false;
  } finally {
    state.turnPageLoading = '';
    renderTurnControls();
  }
}

async function loadOlderTurnWindow() {
  if (!state.activeSession || !state.activeSessionData || state.turnPageLoading) return false;
  const oldestRange = oldestLoadedRange(state.activeSessionData);
  if (!oldestRange || oldestRange.start <= 0) return false;
  const scroller = getTurnScrollElement();
  const previousHeight = scroller ? scroller.scrollHeight : 0;
  const previousTop = scroller ? scroller.scrollTop : 0;
  state.turnPageLoading = 'older';
  renderTurnControls();
  try {
    const page = await fetchTurnWindow(state.activeSession, {
      limit: SESSION_TURN_LIMIT,
      beforeOrdinal: oldestRange.start,
    });
    const merged = mergeTurnWindow(state.activeSessionData, page, oldestRange.start);
    renderSession(merged, { preserveScroll: true });
    requestAnimationFrame(() => {
      const nextScroller = getTurnScrollElement();
      if (!nextScroller) return;
      const delta = nextScroller.scrollHeight - previousHeight;
      nextScroller.scrollTop = Math.max(0, previousTop + delta);
    });
    return true;
  } catch (err) {
    setAnalysisCacheNote(err.message || String(err));
    return false;
  } finally {
    state.turnPageLoading = '';
    renderTurnControls();
  }
}

function maybeLoadOlderTurns() {
  const scroller = getTurnScrollElement();
  if (!scroller || scroller.scrollTop > TURN_SCROLL_LOAD_THRESHOLD_PX) return;
  loadOlderTurnWindow();
}

function getTurnScrollElement() {
  return $('session-view')?.querySelector('.work-panel') || document.scrollingElement || document.documentElement;
}

async function loadRecap() {
  state.active = 'recap';
  state.activeSession = null;
  state.activeSessionData = null;
  state.recapData = null;
  renderSessionList();
  $('empty').hidden = true;
  $('session-view').hidden = true;
  $('recap-view').hidden = false;
  $('recap-btn').disabled = true;
  $('recap-btn').textContent = t('action.generating');
  if ($('run-recap')) {
    $('run-recap').disabled = true;
    $('run-recap').textContent = t('action.generating');
  }
  $('recap-meta').textContent = t('session.loading');
  $('recap-content').innerHTML = `<div class="loading">${escapeHtml(t('recap.loading'))}</div>`;

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
    $('recap-btn').textContent = t('action.resumeWork');
    $('recap-btn').classList.toggle('active', state.active === 'recap');
    if ($('run-recap')) {
      $('run-recap').disabled = false;
      $('run-recap').textContent = t('action.resumeWork');
    }
  }
}

function showEmpty() {
  state.activeSession = null;
  state.activeSessionData = null;
  state.recapData = null;
  resetTurnSearch();
  $('empty').hidden = false;
  $('recap-view').hidden = true;
  $('session-view').hidden = true;
  clearAnalysis();
  renderTurnControls();
  renderSessionList();
}

function showLoading(session) {
  $('empty').hidden = true;
  $('recap-view').hidden = true;
  $('session-view').hidden = false;
  $('session-title').textContent = session.title || session.id;
  $('session-meta').textContent = t('session.loading');
  $('session-totals').innerHTML = '';
  $('session-context').innerHTML = '';
  $('turns').innerHTML = `<div class="loading">${escapeHtml(t('session.loadingBody'))}</div>`;
  clearAnalysis(t('session.selectLoaded'));
  renderTurnControls();
  renderTurnSearchResults();
}

function showError(session, message) {
  state.activeSessionData = null;
  $('empty').hidden = true;
  $('recap-view').hidden = true;
  $('session-view').hidden = false;
  $('session-title').textContent = session.title || session.id;
  $('session-meta').textContent = t('session.error');
  $('session-totals').innerHTML = '';
  $('turns').innerHTML = '';
  const el = document.createElement('pre');
  el.className = 'error';
  el.textContent = message;
  $('turns').appendChild(el);
  renderTurnControls();
  renderTurnSearchResults();
}

function showRecapError(message) {
  $('recap-meta').textContent = t('session.error');
  state.recapData = null;
  $('recap-content').innerHTML = '';
  const el = document.createElement('pre');
  el.className = 'error';
  el.textContent = message;
  $('recap-content').appendChild(el);
}

function showSessionListError(message) {
  const list = $('session-list');
  if (!list) return;
  list.innerHTML = '';
  const el = document.createElement('pre');
  el.className = 'error';
  el.textContent = message;
  list.appendChild(el);
}

function renderSession(data, options = {}) {
  data = normalizeSessionData(data);
  const session = data.session;
  const summary = session.summary || {};

  state.active = sessionKey(session);
  state.activeSession = {
    provider: session.provider,
    id: session.id,
    title: session.title || session.id,
    project: session.project || '',
  };
  state.activeSessionData = data;
  state.recapData = null;

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
    <div>${escapeHtml(formatSessionRange(session))}</div>
    <div>${escapeHtml(formatDuration(sessionDurationMs(session)))} · ${summary.turns || 0} ${escapeHtml(t('turn.turns'))} · ${escapeHtml(t('session.model'))}: ${escapeHtml(session.model || '-')}</div>
  `;
  $('session-totals').innerHTML = `
    <div class="stat cost"><div class="label">${escapeHtml(t('metric.cost'))}</div><div class="value">${fmtCost(summary.costUSD)}</div></div>
    <div class="stat"><div class="label">${escapeHtml(t('metric.turns'))}</div><div class="value">${summary.turns || 0}</div></div>
    <div class="stat"><div class="label">${escapeHtml(t('metric.input'))}</div><div class="value">${fmtTokens(summary.inputTokens || 0)}</div></div>
    <div class="stat"><div class="label">${escapeHtml(t('metric.output'))}</div><div class="value">${fmtTokens(summary.outputTokens || 0)}</div></div>
    <div class="stat"><div class="label">${escapeHtml(t('metric.cacheRead'))}</div><div class="value">${fmtTokens(summary.cacheReadTokens || 0)}</div></div>
    <div class="stat"><div class="label">${escapeHtml(t('metric.cacheWrite'))}</div><div class="value">${fmtTokens(summary.cacheWriteTokens || 0)}</div></div>
  `;
  renderContext(session);
  restoreAnalysis();
  renderTurnControls();
  renderTurnSearchResults();
  renderTurns(data, options);
}

function renderRecap(data) {
  const recap = data.recap || {};
  state.recapData = data;
  state.recapMarkdown = data.markdown || '';
  $('recap-meta').textContent = [
    `${(recap.sessions || []).length} ${t('recap.sessions')}`,
    `${(recap.projects || []).length} ${t('recap.projects')}`,
    t('recap.since', { time: fmtTime(recap.since) }),
  ].join(' · ');
  $('recap-content').innerHTML = '';
  for (const section of parseMarkdownSections(state.recapMarkdown)) {
    const card = document.createElement('section');
    card.className = `recap-section ${sectionSlug(section.title)}`;
    const title = document.createElement('h3');
    title.textContent = section.title;
    const body = document.createElement('div');
    body.className = 'recap-body';
    body.textContent = section.body || t('recap.noItems');
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

function normalizeSessionData(data = {}) {
  const range = normalizedLoadedRange(data);
  const loadedRanges = Array.isArray(data.loadedRanges) && data.loadedRanges.length
    ? mergeRanges(data.loadedRanges)
    : mergeRanges([range]);
  return {
    ...data,
    loadedRange: rangeEnvelope(loadedRanges) || range,
    loadedRanges,
  };
}

function mergeTurnWindow(current, page, anchorOrdinal = null) {
  if (!current) return trimTurnWindows(normalizeSessionData(page), anchorOrdinal ?? page?.target?.ordinal);
  const currentRange = normalizedLoadedRange(current);
  const pageRange = normalizedLoadedRange(page);
  const byOrdinal = new Map();
  for (const turn of current.turns || []) {
    const ordinal = Number.isInteger(turn.ordinal) ? turn.ordinal : null;
    if (ordinal != null) byOrdinal.set(ordinal, turn);
  }
  for (const turn of page.turns || []) {
    const ordinal = Number.isInteger(turn.ordinal) ? turn.ordinal : null;
    if (ordinal != null) byOrdinal.set(ordinal, turn);
  }
  const turns = [...byOrdinal.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, turn]) => turn);
  return trimTurnWindows(normalizeSessionData({
    ...current,
    ...page,
    session: current.session || page.session,
    turns,
    turnsTotal: current.turnsTotal || page.turnsTotal || turns.length,
    loadedRanges: mergeRanges([...(current.loadedRanges || [currentRange]), pageRange]),
  }), anchorOrdinal ?? page?.target?.ordinal ?? pageRange.start);
}

function mergeRanges(ranges) {
  const sorted = (ranges || [])
    .filter((range) => Number.isInteger(range?.start) && Number.isInteger(range?.end) && range.end >= range.start)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ start: range.start, end: range.end });
    }
  }
  return merged;
}

function rangeEnvelope(ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return null;
  return {
    start: Math.min(...ranges.map((range) => range.start)),
    end: Math.max(...ranges.map((range) => range.end)),
  };
}

function trimTurnWindows(data, anchorOrdinal = null) {
  const turns = (data.turns || [])
    .filter((turn) => Number.isInteger(turn.ordinal))
    .sort((a, b) => a.ordinal - b.ordinal);
  if (turns.length <= TURN_WINDOW_CACHE_LIMIT) return data;
  const fallbackAnchor = turns[turns.length - 1]?.ordinal ?? 0;
  const anchor = Number.isInteger(anchorOrdinal) ? anchorOrdinal : fallbackAnchor;
  const kept = turns
    .map((turn) => ({ turn, distance: Math.abs(turn.ordinal - anchor) }))
    .sort((a, b) => a.distance - b.distance || a.turn.ordinal - b.turn.ordinal)
    .slice(0, TURN_WINDOW_CACHE_LIMIT)
    .map((entry) => entry.turn)
    .sort((a, b) => a.ordinal - b.ordinal);
  const loadedRanges = rangesFromTurns(kept);
  return normalizeSessionData({
    ...data,
    turns: kept,
    loadedRanges,
    loadedRange: rangeEnvelope(loadedRanges) || data.loadedRange,
  });
}

function rangesFromTurns(turns) {
  const ordinals = turns
    .map((turn) => turn.ordinal)
    .filter((ordinal) => Number.isInteger(ordinal))
    .sort((a, b) => a - b);
  const ranges = [];
  for (const ordinal of ordinals) {
    const last = ranges[ranges.length - 1];
    if (last && ordinal <= last.end) {
      last.end = Math.max(last.end, ordinal + 1);
    } else {
      ranges.push({ start: ordinal, end: ordinal + 1 });
    }
  }
  return ranges;
}

function oldestLoadedRange(data = {}) {
  const ranges = Array.isArray(data.loadedRanges) && data.loadedRanges.length
    ? data.loadedRanges
    : [normalizedLoadedRange(data)];
  return mergeRanges(ranges)[0] || null;
}

function renderTurns(data, options = {}) {
  const turns = $('turns');
  turns.className = 'turns';
  turns.innerHTML = '';

  const visibleTurns = filterTurnsByKind(data.turns || []);
  const decorated = decorateTurns(visibleTurns);
  const rendered = groupOperationalRuns(decorated);
  let currentGroup = '';
  for (const item of rendered) {
    const group = formatDateGroup(item.timestamp);
    if (group !== currentGroup) {
      currentGroup = group;
      turns.appendChild(renderTurnDateGroup(group));
    }
    turns.appendChild(item.kind === 'tool_group' ? renderToolRunGroup(item) : renderTurn(item));
  }

  if (!rendered.length && (data.turns || []).length) {
    const note = document.createElement('div');
    note.className = 'turn-empty-note';
    note.textContent = t('turn.noMatch');
    turns.appendChild(note);
  }
}

function normalizedLoadedRange(data = {}) {
  const turns = data.turns || [];
  const total = data.turnsTotal || turns.length;
  const range = data.loadedRange || {};
  const end = Number.isInteger(range.end) ? range.end : total;
  return {
    start: Number.isInteger(range.start) ? range.start : Math.max(0, end - turns.length),
    end,
  };
}

function turnRangeStatus(data = {}) {
  const turns = data.turns || [];
  const total = data.turnsTotal || turns.length;
  if (!total) return '';
  if (turns.length >= total) return t('turn.windowComplete', { total });
  if (Array.isArray(data.loadedRanges) && data.loadedRanges.length > 1) {
    return t('turn.windowSparse', {
      loaded: turns.length,
      total,
      windows: data.loadedRanges.length,
    });
  }
  const range = normalizedLoadedRange(data);
  return t('turn.window', {
    start: Math.min(total, range.start + 1),
    end: Math.min(total, range.end),
    total,
  });
}

function filterTurnsByKind(turns) {
  if (state.turnKindFilter === 'all') return turns;
  return turns.filter((turn) => turn.kind === state.turnKindFilter);
}

function resetTurnSearch() {
  if (state.turnSearchTimer) clearTimeout(state.turnSearchTimer);
  state.turnSearchTimer = null;
  state.turnSearchQuery = '';
  state.turnSearchResults = [];
  state.turnSearchLoading = false;
  state.turnSearchError = '';
  const input = $('turn-session-search');
  if (input) input.value = '';
  renderTurnSearchResults();
}

function clearTurnSearchResults() {
  if (state.turnSearchTimer) clearTimeout(state.turnSearchTimer);
  state.turnSearchTimer = null;
  state.turnSearchResults = [];
  state.turnSearchLoading = false;
  state.turnSearchError = '';
  renderTurnSearchResults();
}

function scheduleTurnSearch() {
  if (state.turnSearchTimer) clearTimeout(state.turnSearchTimer);
  state.turnSearchTimer = setTimeout(() => {
    state.turnSearchTimer = null;
    runTurnSearch().catch((err) => {
      state.turnSearchLoading = false;
      state.turnSearchError = err.message || String(err);
      renderTurnSearchResults();
    });
  }, 180);
}

async function runTurnSearch() {
  const query = state.turnSearchQuery.trim();
  state.turnSearchError = '';
  if (!query || query.length < 2 || !state.activeSession) {
    state.turnSearchResults = [];
    state.turnSearchLoading = false;
    renderTurnSearchResults();
    return;
  }
  state.turnSearchLoading = true;
  renderTurnSearchResults();
  const data = await searchSessionTurns(query);
  if (state.turnSearchQuery.trim() !== query) return;
  state.turnSearchResults = data.hits || [];
  state.turnSearchLoading = false;
  renderTurnSearchResults();
}

function renderTurnSearchResults() {
  const results = $('turn-search-results');
  if (!results) return;
  const query = state.turnSearchQuery.trim();
  if (!state.activeSession || !query) {
    results.innerHTML = '';
    return;
  }
  if (state.turnSearchLoading) {
    results.innerHTML = `<div class="turn-search-note">${escapeHtml(t('turn.searchLoading'))}</div>`;
    return;
  }
  if (state.turnSearchError) {
    results.innerHTML = `<div class="turn-search-note error">${escapeHtml(t('turn.searchError'))}: ${escapeHtml(state.turnSearchError)}</div>`;
    return;
  }
  if (!state.turnSearchResults.length) {
    results.innerHTML = query.length < 2 ? '' : `<div class="turn-search-note">${escapeHtml(t('turn.searchNoResults'))}</div>`;
    return;
  }
  results.innerHTML = `
    <div class="turn-search-summary">${escapeHtml(t('turn.searchCount', { count: state.turnSearchResults.length }))}</div>
    ${state.turnSearchResults.map((hit) => `
      <button class="turn-search-result" type="button" data-turn-id="${escapeHtml(hit.turnId)}">
        <span class="role ${escapeHtml(hit.kind)}">${escapeHtml(hit.kind || 'turn')}</span>
        <span class="turn-search-snippet">${escapeHtml(hit.snippet || hit.title || hit.turnId)}</span>
      </button>
    `).join('')}
  `;
}

function decorateTurns(turns) {
  return turns.map((turn, index) => {
    const previous = turns[index - 1];
    const timestamp = Date.parse(turn.timestamp || '');
    const previousTimestamp = Date.parse(previous?.timestamp || '');
    const gapFromPreviousMs = Number.isFinite(timestamp) && Number.isFinite(previousTimestamp) && timestamp >= previousTimestamp
      ? timestamp - previousTimestamp
      : null;
    return {
      ...turn,
      renderIndex: index,
      gapFromPreviousMs,
      isLongGap: isLongGap(gapFromPreviousMs),
    };
  });
}

function groupOperationalRuns(turns) {
  const grouped = [];
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    if (buffer.length >= 3) {
      const first = buffer[0];
      const last = buffer[buffer.length - 1];
      grouped.push({
        id: `tool-group:${first.id || first.renderIndex}:${last.id || last.renderIndex}`,
        kind: 'tool_group',
        timestamp: first.timestamp,
        turns: buffer,
        title: toolRunGroupTitle(buffer),
      });
    } else {
      grouped.push(...buffer);
    }
    buffer = [];
  };
  for (const turn of turns) {
    if (isToolTurn(turn) && !turn.isLongGap) {
      buffer.push(turn);
    } else {
      flush();
      grouped.push(turn);
    }
  }
  flush();
  return grouped;
}

function toolRunGroupTitle(turns) {
  const names = [...new Set(turns.map((turn) => turn.title || turn.kind).filter(Boolean))].slice(0, 3);
  return `${turns.length} operations${names.length ? ` · ${names.join(', ')}` : ''}`;
}

function renderTurnDateGroup(label) {
  const el = document.createElement('div');
  el.className = 'turn-date-group';
  el.textContent = label;
  return el;
}

function isLongGap(ms) {
  return Number.isFinite(Number(ms)) && Number(ms) >= LONG_GAP_THRESHOLD_MS;
}

function renderTurn(turn) {
  const el = document.createElement('article');
  el.className = [
    'turn',
    turn.kind,
    turn.isLongGap ? 'long-gap' : '',
  ].filter(Boolean).join(' ');
  el.id = turnElementId(turn.id);
  el.dataset.turnId = turn.id || '';
  el.dataset.renderIndex = String(turn.renderIndex ?? '');

  const head = document.createElement('div');
  head.className = 'turn-head';
  head.innerHTML = `
    <div class="left">
      <span class="role ${escapeHtml(turn.kind)}">${escapeHtml(turn.kind)}</span>
      <span class="ts">${escapeHtml(formatFullDateTime(turn.timestamp) || shortTime(turn.timestamp))}</span>
      ${turn.isLongGap ? `<span class="gap-badge">${escapeHtml(formatDuration(turn.gapFromPreviousMs))} ${escapeHtml(t('turn.gap'))}</span>` : ''}
      <span class="turn-title">${escapeHtml(turn.title || '')}</span>
    </div>
    ${usageHtml(turn)}
  `;
  el.appendChild(head);

  if (isToolTurn(turn)) {
    el.appendChild(renderToolDetails(turn));
  } else {
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
        btn.textContent = t('action.expand');
        btn.addEventListener('click', () => {
          body.classList.toggle('collapsed');
          btn.textContent = body.classList.contains('collapsed') ? t('action.expand') : t('action.collapse');
        });
        el.appendChild(btn);
      }
    });
  }

  return el;
}

function renderToolRunGroup(group) {
  const el = document.createElement('article');
  el.className = 'turn tool-run-group';
  el.id = turnElementId(group.id);
  el.dataset.turnId = group.id || '';

  const details = document.createElement('details');
  details.className = 'tool-run-details';
  details.open = false;
  const summary = document.createElement('summary');
  summary.innerHTML = `
    <div class="turn-head">
      <div class="left">
        <span class="role tool_call">TOOLS</span>
        <span class="ts">${escapeHtml(formatFullDateTime(group.timestamp) || shortTime(group.timestamp))}</span>
        <span class="turn-title">${escapeHtml(group.title)}</span>
      </div>
    </div>
  `;
  const body = document.createElement('div');
  body.className = 'tool-run-list';
  for (const turn of group.turns) {
    const row = document.createElement('div');
    row.className = [
      'tool-run-entry',
      turn.kind,
    ].filter(Boolean).join(' ');
    row.id = turnElementId(turn.id);
    row.dataset.turnId = turn.id || '';
    row.innerHTML = `
      <span class="role ${escapeHtml(turn.kind)}">${escapeHtml(turn.kind)}</span>
      <span class="ts">${escapeHtml(formatFullDateTime(turn.timestamp) || shortTime(turn.timestamp))}</span>
      <span class="turn-title">${escapeHtml(turn.title || '')}</span>
      <span class="turn-preview">${escapeHtml(turnPreview(turn.text))}</span>
    `;
    body.appendChild(row);
  }
  details.append(summary, body);
  el.appendChild(details);
  return el;
}

function isToolTurn(turn) {
  return turn.kind === 'tool_call' || turn.kind === 'tool_result' || turn.kind === 'hook';
}

function renderToolDetails(turn) {
  const details = document.createElement('details');
  details.className = 'turn-details';
  details.open = false;

  const summary = document.createElement('summary');
  const label = document.createElement('span');
  label.textContent = operationalTurnLabel(turn.kind);
  const preview = document.createElement('span');
  preview.className = 'turn-preview';
  preview.textContent = turnPreview(turn.text);
  summary.append(label, preview);

  const body = document.createElement('div');
  body.className = 'turn-body';
  body.textContent = turn.text || '';
  details.append(summary, body);
  return details;
}

function operationalTurnLabel(kind) {
  if (kind === 'tool_call') return t('turn.toolCall');
  if (kind === 'tool_result') return t('turn.toolResult');
  if (kind === 'hook') return t('turn.hook');
  return t('turn.details');
}

function turnPreview(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return t('turn.noPayload');
  return normalized.length > 120 ? normalized.slice(0, 117) + '...' : normalized;
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
    const raw = localStorage.getItem('runwhy:layout:v1')
      || localStorage.getItem('agent-session-viewer:layout:v1');
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
    localStorage.setItem('runwhy:layout:v1', JSON.stringify({
      sidebarCollapsed: state.sidebarCollapsed,
      detailCollapsed: state.detailCollapsed,
    }));
  } catch {}
}

function restoreTurnPreferences() {
  try {
    const raw = localStorage.getItem(TURN_PREFERENCES_KEY);
    if (raw) {
      const prefs = JSON.parse(raw);
      if (TURN_KIND_FILTERS.has(prefs.turnKindFilter)) {
        state.turnKindFilter = prefs.turnKindFilter;
      }
    }
  } catch {}
  renderTurnControls();
}

function saveTurnPreferences() {
  try {
    localStorage.setItem(TURN_PREFERENCES_KEY, JSON.stringify({
      turnKindFilter: state.turnKindFilter,
    }));
  } catch {}
}

function renderTurnControls() {
  const hasSession = Boolean(state.activeSessionData);
  const filter = $('turn-kind-filter');
  if (filter) {
    filter.value = state.turnKindFilter;
    filter.disabled = !hasSession;
  }
  const status = $('turn-range-status');
  if (status) {
    const text = hasSession ? turnRangeStatus(state.activeSessionData) : '';
    status.textContent = state.turnPageLoading === 'older' && text
      ? `${text} · ${t('turn.loadingOlder')}`
      : text;
  }
  const turns = $('turns');
  if (turns) turns.className = 'turns';
}

function toggleTurnKindFilter(kind) {
  if (!TURN_KIND_FILTERS.has(kind)) return;
  if (state.turnKindFilter === kind) return;
  state.turnKindFilter = kind;
  saveTurnPreferences();
  renderTurnControls();
  if (state.activeSessionData) renderTurns(state.activeSessionData, { preserveScroll: true });
}

function renderLayoutState() {
  const app = $('app');
  if (!app) return;
  app.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
  app.classList.toggle('detail-collapsed', state.detailCollapsed);

  const sidebarButton = $('toggle-sidebar');
  if (sidebarButton) {
    sidebarButton.setAttribute('aria-expanded', String(!state.sidebarCollapsed));
    sidebarButton.setAttribute('aria-label', state.sidebarCollapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar'));
    sidebarButton.setAttribute('title', t('layout.toggleSidebar'));
    sidebarButton.textContent = state.sidebarCollapsed ? '>>' : '<<';
  }

  const detailButton = $('toggle-detail-rail');
  if (detailButton) {
    detailButton.setAttribute('aria-expanded', String(!state.detailCollapsed));
    detailButton.setAttribute('aria-label', state.detailCollapsed ? t('layout.expandDetails') : t('layout.collapseDetails'));
    detailButton.setAttribute('title', t('layout.toggleDetails'));
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

function renderSessionPaging() {
  const button = $('load-more-sessions');
  if (!button) return;
  button.hidden = !state.hasMoreSessions && !state.loadingSessions;
  button.disabled = state.loadingSessions;
  button.textContent = state.loadingSessions
    ? t('action.loading')
    : `${t('action.loadMore')} (${state.sessions.length}/${state.sessionTotal})`;
}

function scheduleSessionSearch() {
  if (state.sessionSearchTimer) clearTimeout(state.sessionSearchTimer);
  state.sessionSearchTimer = setTimeout(() => {
    state.sessionSearchTimer = null;
    loadSessions({ reset: false }).catch((err) => {
      showSessionListError(err.stack || String(err));
    });
  }, 180);
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
    'runwhy',
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
    setAnalysisCacheNote(t('analysis.savedFailed'));
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
    clearAnalysis(t('analysis.cleared'));
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
    ${checks.fallbackUsed ? `<div class="analysis-warning">${escapeHtml(t('analysis.fallbackUsed'))}</div>` : ''}
    ${renderDelayTimeline(segments)}
    ${renderRootCauses(causes)}
    ${renderAnalysisList(t('analysis.unknowns'), unknowns)}
  `;
  if (options.source === 'cache') {
    setAnalysisCacheNote(t('analysis.restored', { time: shortSavedTime(options.savedAt) }));
  } else if (options.source === 'fresh') {
    setAnalysisCacheNote(t('analysis.saved', { time: shortSavedTime(options.savedAt) }));
  }
  renderAnalysisActions();
}

function renderDiagnosisHero(result, checks) {
  const primary = (result.topDelaySegments || [])[0] || null;
  const rootCause = (result.rootCauses || [])[0] || null;
  const title = primary
    ? `${delayCategoryLabel(primary.category)} · ${formatDuration(primary.durationMs)}`
    : rootCause?.cause || t('analysis.noDominantDelay');
  const confidence = result.confidence || primary?.confidence || 'unknown';
  const summary = result.summary || t('analysis.noSummary');
  return `
    <section class="diagnosis-hero">
      <div class="diagnosis-eyebrow">${escapeHtml(t('analysis.primaryDiagnosis'))}</div>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(summary)}</p>
      <div class="diagnosis-meta">
        <span>${escapeHtml(t('analysis.confidence'))} ${escapeHtml(confidence)}</span>
        <span>${checks.schemaValid === false ? escapeHtml(t('analysis.schemaWarning')) : escapeHtml(t('analysis.schemaValid'))}</span>
        <span>${checks.fallbackUsed ? escapeHtml(t('analysis.localFallback')) : escapeHtml(t('analysis.llmStructured'))}</span>
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
      <h4>${escapeHtml(t('analysis.delayTimeline'))}</h4>
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
              <span>${escapeHtml(segment.confidence || 'unknown')} ${escapeHtml(t('analysis.confidence'))}</span>
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
      <h4>${escapeHtml(t('analysis.rootCauses'))}</h4>
      <ul>
        ${items.map((cause) => `
          <li>
            <strong>${escapeHtml(cause.cause || t('analysis.cause'))}</strong>
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
  $('analysis-result').innerHTML = `<div class="dim">${escapeHtml(t('analysis.waiting'))}</div>`;
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
  clearAnalysis(t('analysis.cleared'));
}

function renderAnalysisButton() {
  const button = $('run-analysis');
  if (!button) return;
  button.disabled = state.analysisLoading || !state.activeSession || state.active === 'recap';
  button.textContent = state.analysisLoading ? t('action.analyzing') : t('action.analyze');
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
    ? t('analysis.stage.stopped')
    : state.analysisProgressStatus === 'done'
      ? t('analysis.stage.completed')
      : t('analysis.stage.running');
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
            <strong>${escapeHtml(t(title))}</strong>
            <span>${escapeHtml(t(detail))}</span>
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
  button.textContent = t('action.copied');
  setTimeout(() => {
    button.textContent = t('action.copyMarkdown');
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
    const hiddenTurn = state.activeSessionData?.turns?.some((turn) => turn.id === turnId);
    if (hiddenTurn && state.turnKindFilter !== 'all') {
      state.turnKindFilter = 'all';
      saveTurnPreferences();
      renderTurnControls();
      renderTurns(state.activeSessionData, { preserveScroll: true });
      requestAnimationFrame(() => jumpToEvidence(turnId));
      return;
    }
    loadTurnsAround(turnId).then((loaded) => {
      if (loaded) requestAnimationFrame(() => jumpToEvidence(turnId));
    });
    return;
  }
  expandEvidenceTurn(el);
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelectorAll('.turn.evidence-active, .turn.evidence-context, .tool-run-entry.evidence-active').forEach((turn) => {
    turn.classList.remove('evidence-active');
    turn.classList.remove('evidence-context');
  });
  const activeEl = el.classList.contains('tool-run-entry') ? el : (el.closest('.turn') || el);
  activeEl.classList.add('evidence-active');
  const turnEl = el.closest('.turn') || el;
  const turnEls = [...document.querySelectorAll('.turn')];
  const index = turnEls.indexOf(turnEl);
  for (const neighbor of [turnEls[index - 1], turnEls[index + 1]]) {
    if (neighbor) neighbor.classList.add('evidence-context');
  }
  setTimeout(() => {
    activeEl.classList.remove('evidence-active');
    document.querySelectorAll('.turn.evidence-context, .tool-run-entry.evidence-active').forEach((turn) => {
      turn.classList.remove('evidence-context');
      turn.classList.remove('evidence-active');
    });
  }, 2400);
}

function expandEvidenceTurn(el) {
  const group = el.closest('.tool-run-group');
  if (group) {
    const groupDetails = group.querySelector('.tool-run-details');
    if (groupDetails) groupDetails.open = true;
  }
  const details = el.querySelector('.turn-details');
  if (details) details.open = true;
  const body = el.querySelector('.turn-body.collapsed');
  if (body) {
    body.classList.remove('collapsed');
    const button = el.querySelector('.expand-btn');
    if (button) button.textContent = 'Collapse';
  }
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

$('settings-button').addEventListener('click', () => {
  toggleSettingsPopover();
});

$('language-switcher').addEventListener('change', (event) => {
  setLanguage(event.target.value);
});

$('provider-filter').addEventListener('change', async (event) => {
  state.providerFilter = event.target.value;
  state.active = null;
  state.activeSession = null;
  state.activeSessionData = null;
  state.sessions = [];
  state.sessionTotal = 0;
  state.hasMoreSessions = false;
  await loadSessions({ reset: true });
});

$('filter').addEventListener('input', (event) => {
  state.filter = event.target.value;
  state.sessions = [];
  state.sessionTotal = 0;
  state.hasMoreSessions = false;
  renderSessionList();
  scheduleSessionSearch();
});

$('toggle-sidebar').addEventListener('click', () => {
  toggleSidebar();
});

$('toggle-detail-rail').addEventListener('click', () => {
  toggleDetailRail();
});

$('turn-kind-filter').addEventListener('change', (event) => {
  toggleTurnKindFilter(event.target.value);
});

$('turn-session-search').addEventListener('input', (event) => {
  state.turnSearchQuery = event.target.value;
  scheduleTurnSearch();
});

$('turn-search-results').addEventListener('click', (event) => {
  const button = event.target.closest('.turn-search-result');
  if (!button) return;
  const turnId = button.dataset.turnId || '';
  clearTurnSearchResults();
  jumpToEvidence(turnId);
});

getTurnScrollElement().addEventListener('scroll', () => {
  maybeLoadOlderTurns();
}, { passive: true });

$('sessions-nav').addEventListener('click', () => {
  if (state.activeSessionData) {
    renderSession(state.activeSessionData, { preserveScroll: true });
  } else {
    showEmpty();
  }
});

$('load-more-sessions').addEventListener('click', () => {
  loadSessions({ append: true }).catch((err) => {
    showSessionListError(err.stack || String(err));
  });
});

$('recap-btn').addEventListener('click', () => {
  toggleRecapPopover();
});

$('run-recap').addEventListener('click', () => {
  closeTopbarPopovers();
  loadRecap().catch((err) => showRecapError(err.stack || String(err)));
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
    $('copy-recap').textContent = t('action.copied');
    setTimeout(() => {
      $('copy-recap').textContent = t('action.copyMarkdown');
    }, 1200);
  }
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.settings-menu') || event.target.closest('.topbar-recap-group')) return;
  closeTopbarPopovers();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeTopbarPopovers();
});

init().catch((err) => {
  showError({ id: 'startup' }, err.stack || String(err));
});
