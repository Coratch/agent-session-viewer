import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

const SESSION_LIMIT = 80;
const TURN_LIMIT = 200;
const TURN_CACHE_LIMIT = 700;
const LANGUAGE_KEY = 'runwhy.language';

type Language = 'en' | 'zh-CN';
type MobilePane = 'sessions' | 'session' | 'inspector';
type InspectorTab = 'overview' | 'search' | 'analysis';

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DetailField = {
  key: string;
  label: string;
  value: string;
  valueClassName?: string;
};

const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: 'zh-CN', label: '中文' },
  { id: 'en', label: 'English' },
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    subtitle: 'Private AI work memory',
    searchSessions: 'Search sessions...',
    allProviders: 'All providers',
    settings: 'Settings',
    workspace: 'Workspace',
    providerFilter: 'Provider',
    language: 'Language',
    resumeWork: 'Resume',
    resumeShort: 'Resume',
    openLatest: 'Open Latest',
    searchHistory: 'Search History',
    showRecapAction: 'Build a Recap',
    latestSessionAction: 'Open the most recent session',
    searchHistoryAction: 'Search local session history',
    recapActionCopy: 'Turn recent work into a crisp handoff.',
    latestActionCopy: 'Return to the newest run.',
    searchActionCopy: 'Find a decision, bug, or handoff.',
    indexedSessions: 'indexed sessions',
    localOnly: 'Local only',
    loadingSession: 'Loading session...',
    selectSessionTitle: 'Open a session to see details',
    selectSessionCopy: 'Context, search, and analysis appear after a session is opened.',
    mobileSessions: 'Sessions',
    mobileSession: 'Session',
    mobileInspector: 'Details',
    generating: 'Generating...',
    sessions: 'Sessions',
    noSession: 'Pick up the thread',
    noSessionCopy: 'Recent sessions, decisions, and handoffs stay private on this machine.',
    recapEyebrow: 'Recap',
    recapTitle: 'Pick Up Where I Left Off',
    recapDays: 'Days',
    projects: 'projects',
    since: 'since',
    copyMarkdown: 'Copy Markdown',
    copied: 'Copied',
    copyValue: 'Copy',
    noRecap: 'Run a recap to collect recent projects, open threads, and next actions.',
    noItems: 'No items found.',
    inspector: 'Details',
    overviewTab: 'Info',
    overview: 'Overview',
    detailOverview: 'Overview',
    detailUsage: 'Usage',
    detailActions: 'Actions',
    sessionIdLabel: 'Session ID',
    source: 'Source',
    created: 'Created',
    updated: 'Updated',
    copySessionId: 'Copy Session ID',
    exportSession: 'Export',
    exported: 'Exported',
    metrics: 'Signals',
    context: 'Context',
    turns: 'Turns',
    input: 'Input',
    output: 'Output',
    cacheRead: 'Cache read',
    cacheWrite: 'Cache write',
    cost: 'Cost',
    searchTab: 'Search',
    searchTurns: 'Find in session',
    searchFullSession: 'Search full session...',
    analysis: 'Analysis',
    analysisTab: 'Analyze',
    analyze: 'Analyze',
    analyzing: 'Analyzing...',
    clear: 'Clear',
    focusPlaceholder: 'Focus...',
    selectLoaded: 'Select a loaded session to analyze.',
    analysisReady: 'Analysis ready.',
    analysisFailed: 'Analysis failed.',
    primaryDiagnosis: 'Primary diagnosis',
    confidence: 'Confidence',
    duration: 'Duration',
    total: 'Total',
    active: 'Active',
    idle: 'Idle',
    delaySegments: 'Delay segments',
    rootCauses: 'Root causes',
    unknowns: 'Unknowns',
    fallbackUsed: 'Local fallback was used.',
    noAnalysis: 'No analysis result yet.',
    type: 'Type',
    loadingOlder: 'loading older turns...',
    noPayload: 'No payload',
  },
  'zh-CN': {
    subtitle: '私有 AI 工作记忆',
    searchSessions: '搜索会话...',
    allProviders: '全部来源',
    settings: '设置',
    workspace: '工作区',
    providerFilter: '来源',
    language: '语言',
    resumeWork: '继续',
    resumeShort: '继续',
    openLatest: '打开最近会话',
    searchHistory: '搜索历史',
    showRecapAction: '生成复工摘要',
    latestSessionAction: '打开最近一次会话',
    searchHistoryAction: '搜索本地会话历史',
    recapActionCopy: '把近期工作整理成清晰交接。',
    latestActionCopy: '回到最新一次执行现场。',
    searchActionCopy: '查找决策、问题或交接信息。',
    indexedSessions: '已索引会话',
    localOnly: '仅本地',
    loadingSession: '正在加载会话...',
    selectSessionTitle: '打开会话后查看详情',
    selectSessionCopy: '上下文、搜索和分析会在打开会话后显示。',
    mobileSessions: '会话',
    mobileSession: '阅读',
    mobileInspector: '详情',
    generating: '生成中...',
    sessions: '会话',
    noSession: '回到刚才的工作',
    noSessionCopy: '近期会话、决策和交接信息只保留在本机。',
    recapEyebrow: '回顾',
    recapTitle: '继续上次工作',
    recapDays: '天数',
    projects: '个项目',
    since: '自',
    copyMarkdown: '复制 Markdown',
    copied: '已复制',
    copyValue: '复制',
    noRecap: '运行复工回顾以汇总近期项目、未闭环事项和下一步动作。',
    noItems: '暂无内容。',
    inspector: '详情',
    overviewTab: '信息',
    overview: '概览',
    detailOverview: '概览',
    detailUsage: '用量',
    detailActions: '操作',
    sessionIdLabel: 'Session ID',
    source: '来源',
    created: '创建时间',
    updated: '更新时间',
    copySessionId: '复制 Session ID',
    exportSession: '导出',
    exported: '已导出',
    metrics: '信号',
    context: '上下文',
    turns: '轮次',
    input: '输入',
    output: '输出',
    cacheRead: '缓存读取',
    cacheWrite: '缓存写入',
    cost: '成本',
    searchTab: '搜索',
    searchTurns: '会话内查找',
    searchFullSession: '搜索完整会话...',
    analysis: '分析',
    analysisTab: '分析',
    analyze: '分析',
    analyzing: '分析中...',
    clear: '清除',
    focusPlaceholder: '关注点...',
    selectLoaded: '选择已加载会话后可分析。',
    analysisReady: '分析完成。',
    analysisFailed: '分析失败。',
    primaryDiagnosis: '主要诊断',
    confidence: '置信度',
    duration: '耗时',
    total: '总计',
    active: '活跃',
    idle: '空闲',
    delaySegments: '延迟片段',
    rootCauses: '根因',
    unknowns: '未知项',
    fallbackUsed: '已使用本地兜底分析。',
    noAnalysis: '暂无分析结果。',
    type: '类型',
    loadingOlder: '正在加载更早轮次...',
    noPayload: '无内容',
  },
};

type ProviderInfo = {
  id: string;
  label?: string;
  rootDir?: string;
};

type SessionSummary = {
  id: string;
  provider: string;
  title?: string;
  project?: string;
  cwd?: string;
  createdAt?: string;
  updatedAt?: string;
  model?: string;
  meta?: Record<string, unknown>;
  summary?: {
    turns?: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    costUSD?: number | null;
  };
};

type Turn = {
  id: string;
  ordinal: number;
  kind: string;
  role?: string;
  timestamp?: string;
  title?: string;
  text?: string;
  preview?: string;
  content?: string;
  metadata?: Record<string, unknown>;
};

type LoadedRange = {
  start: number;
  end: number;
};

type SessionDetail = {
  session: SessionSummary;
  turns: Turn[];
  turnsTotal: number;
  loadedRange?: LoadedRange;
  loadedRanges?: LoadedRange[];
  hasOlderTurns?: boolean;
  target?: {
    turnId?: string | null;
    ordinal?: number | null;
    found?: boolean | null;
  };
};

type TurnWindow = {
  turns: Turn[];
  turnsTotal: number;
  loadedRange: LoadedRange;
  hasOlder: boolean;
  hasNewer: boolean;
  target?: {
    turnId?: string | null;
    ordinal?: number | null;
    found?: boolean | null;
  };
};

type SearchHit = {
  turnId: string;
  ordinal: number;
  kind: string;
  timestamp?: string;
  title?: string;
  snippet?: string;
};

type SessionsResponse = {
  sessions: SessionSummary[];
  total: number;
};

type SearchResponse = {
  hits: SearchHit[];
};

type RecapProject = {
  name?: string;
};

type RecapPayload = {
  generatedAt?: string;
  since?: string;
  sessions?: SessionSummary[];
  projects?: RecapProject[];
};

type RecapResponse = {
  recap?: RecapPayload;
  markdown?: string;
};

type RecapSection = {
  title: string;
  body: string;
  slug: string;
};

type AnalysisTemplate = {
  id: string;
  title: string;
  description?: string;
  disabled?: boolean;
};

type AnalysisLlm = {
  id: string;
  label?: string;
  enabled?: boolean;
};

type AnalysisTemplatesResponse = {
  templates?: AnalysisTemplate[];
  llms?: AnalysisLlm[];
};

type AnalysisSegment = {
  category?: string;
  durationMs?: number;
  evidenceTurnIds?: string[];
  confidence?: string;
  explanation?: string;
};

type AnalysisCause = {
  cause?: string;
  evidenceTurnIds?: string[];
  recommendation?: string;
};

type AnalysisResult = {
  summary?: string;
  confidence?: string;
  duration?: {
    totalMs?: number;
    activeMs?: number;
    idleMs?: number;
  };
  topDelaySegments?: AnalysisSegment[];
  rootCauses?: AnalysisCause[];
  unknowns?: string[];
};

type AnalysisResponse = {
  templateId?: string;
  llmId?: string;
  result?: AnalysisResult;
  error?: {
    message?: string;
  };
  localChecks?: {
    fallbackUsed?: boolean;
    schemaValid?: boolean;
    invalidEvidenceRefs?: string[];
  };
};

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function apiText(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(await response.text());
  return response.text();
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

async function copyText(text: string): Promise<void> {
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

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeDownloadName(session: Pick<SessionSummary, 'provider' | 'id'>): string {
  const name = `${session.provider}-${session.id}`.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '');
  return `${(name || 'runwhy-session').slice(0, 120)}.md`;
}

function initialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'zh-CN') return saved;
  } catch {
    // Ignore storage errors; navigator language is enough for first render.
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function sessionKey(session: Pick<SessionSummary, 'provider' | 'id'>): string {
  return `${session.provider}:${session.id}`;
}

function formatProvider(provider?: string): string {
  if (provider === 'claude-code') return 'Claude Code';
  if (provider === 'codex') return 'Codex';
  return provider || '-';
}

function formatDate(value?: string): string {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No timestamp';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value?: number | null): string {
  if (value == null) return '0';
  return new Intl.NumberFormat(undefined, { notation: value > 9999 ? 'compact' : 'standard' }).format(value);
}

function formatDuration(value?: number | null): string {
  const ms = Math.max(0, Number(value || 0));
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return `${minutes}m ${String(rest).padStart(2, '0')}s`;
  const hours = Math.floor(minutes / 60);
  const minuteRest = minutes % 60;
  return `${hours}h ${String(minuteRest).padStart(2, '0')}m`;
}

function titleCaseCategory(value?: string): string {
  return String(value || 'unknown')
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

function markdownLine(value: unknown): string {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function appendMarkdownList<T>(
  lines: string[],
  title: string,
  items: T[] | undefined,
  formatter: (item: T) => string,
): void {
  lines.push(`## ${title}`);
  const filtered = (items || []).filter(Boolean).slice(0, 8);
  if (!filtered.length) {
    lines.push('- None', '');
    return;
  }
  for (const item of filtered) lines.push(`- ${markdownLine(formatter(item))}`);
  lines.push('');
}

function analysisToMarkdown(
  data?: AnalysisResponse | null,
  session?: SessionSummary | null,
  templateId = 'time-diagnosis',
  llmId = 'claude-p',
): string {
  if (!data) return '';
  const result = data.result || {};
  const duration = result.duration || {};
  const lines = [
    '# Agent Session Analysis',
    '',
    `- Session: ${markdownLine(session?.title || session?.id || '-')}`,
    `- Provider: ${markdownLine(formatProvider(session?.provider))}`,
    `- Template: ${markdownLine(data.templateId || templateId)}`,
    `- LLM: ${markdownLine(data.llmId || llmId)}`,
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
    (cause.evidenceTurnIds || []).length ? `evidence: ${(cause.evidenceTurnIds || []).join(', ')}` : '',
  ].filter(Boolean).join(' - '));

  appendMarkdownList(lines, 'Unknowns', result.unknowns, (item) => item);

  const checks = data.localChecks || {};
  lines.push('## Local Checks');
  lines.push(`- Fallback used: ${checks.fallbackUsed ? 'yes' : 'no'}`);
  lines.push(`- Schema valid: ${checks.schemaValid === false ? 'no' : 'yes'}`);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function turnText(turn: Turn): string {
  return turn.text || turn.preview || turn.content || '';
}

function mergeRanges(ranges: LoadedRange[]): LoadedRange[] {
  const sorted = ranges
    .filter((range) => Number.isInteger(range.start) && Number.isInteger(range.end) && range.end >= range.start)
    .sort((a, b) => a.start - b.start);
  const merged: LoadedRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function rangesFromTurns(turns: Turn[]): LoadedRange[] {
  const ordinals = turns
    .map((turn) => turn.ordinal)
    .filter((ordinal) => Number.isInteger(ordinal))
    .sort((a, b) => a - b);
  if (!ordinals.length) return [];
  const ranges: LoadedRange[] = [];
  let start = ordinals[0];
  let previous = ordinals[0];
  for (const ordinal of ordinals.slice(1)) {
    if (ordinal === previous + 1) {
      previous = ordinal;
      continue;
    }
    ranges.push({ start, end: previous + 1 });
    start = ordinal;
    previous = ordinal;
  }
  ranges.push({ start, end: previous + 1 });
  return ranges;
}

function trimTurns(turns: Turn[], anchorOrdinal?: number | null): Turn[] {
  if (turns.length <= TURN_CACHE_LIMIT) return turns;
  const anchor = Number.isInteger(anchorOrdinal) ? anchorOrdinal as number : turns[turns.length - 1]?.ordinal;
  return [...turns]
    .sort((a, b) => Math.abs(a.ordinal - anchor) - Math.abs(b.ordinal - anchor))
    .slice(0, TURN_CACHE_LIMIT)
    .sort((a, b) => a.ordinal - b.ordinal);
}

function mergeWindow(detail: SessionDetail, page: TurnWindow, anchorOrdinal?: number | null): SessionDetail {
  const byOrdinal = new Map<number, Turn>();
  for (const turn of detail.turns || []) byOrdinal.set(turn.ordinal, turn);
  for (const turn of page.turns || []) byOrdinal.set(turn.ordinal, turn);
  const turns = trimTurns([...byOrdinal.values()].sort((a, b) => a.ordinal - b.ordinal), anchorOrdinal);
  const loadedRanges = mergeRanges([
    ...(detail.loadedRanges || (detail.loadedRange ? [detail.loadedRange] : [])),
    page.loadedRange,
    ...rangesFromTurns(turns),
  ]);
  return {
    ...detail,
    turns,
    turnsTotal: page.turnsTotal,
    loadedRange: loadedRanges[0],
    loadedRanges,
    hasOlderTurns: loadedRanges[0]?.start > 0,
    target: page.target,
  };
}

function loadedSummary(detail?: SessionDetail | null): string {
  if (!detail) return '';
  const ranges = detail.loadedRanges?.length ? detail.loadedRanges : detail.loadedRange ? [detail.loadedRange] : rangesFromTurns(detail.turns);
  if (!ranges.length) return `Loaded 0 of ${detail.turnsTotal} turns`;
  const loaded = detail.turns.length;
  if (ranges.length === 1) {
    return `Loaded turns ${ranges[0].start + 1}-${ranges[0].end} of ${detail.turnsTotal}`;
  }
  return `Loaded ${loaded} of ${detail.turnsTotal} turns across ${ranges.length} windows`;
}

function oldestRange(detail?: SessionDetail | null): LoadedRange | null {
  const ranges = detail?.loadedRanges?.length ? detail.loadedRanges : detail?.loadedRange ? [detail.loadedRange] : rangesFromTurns(detail?.turns || []);
  return ranges.length ? ranges[0] : null;
}

function sectionSlug(title: string): string {
  return `recap-${title || 'section'}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderRecapSections(markdown: string): RecapSection[] {
  const sections: RecapSection[] = [];
  const lines = String(markdown || '').split('\n');
  let current: RecapSection | null = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      const title = line.replace(/^##\s+/, '');
      current = { title, body: '', slug: sectionSlug(title) };
    } else if (current) {
      current.body += `${current.body ? '\n' : ''}${line}`;
    }
  }
  if (current) sections.push(current);
  return sections;
}

function metricCost(value?: number | null): string {
  return value ? `$${value.toFixed(2)}` : '-';
}

function compactContextValue(key: string, value: string): string {
  const text = String(value || '');
  if (!text) return '-';
  if ((key === 'cwd' || key.toLowerCase().includes('path')) && text.includes('/')) {
    const parts = text.split('/').filter(Boolean);
    if (parts.length > 3) return `.../${parts.slice(-3).join('/')}`;
  }
  if (text.length > 64) return `${text.slice(0, 30)}...${text.slice(-22)}`;
  return text;
}

type CustomSelectProps = {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

function CustomSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const choose = useCallback((option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }, [onChange]);

  return (
    <div ref={rootRef} className={`custom-select ${className}`}>
      {label ? <span className="custom-select-label">{label}</span> : null}
      <button
        className="custom-select-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{selected?.label || value}</span>
        <span className="custom-select-caret" aria-hidden="true">v</span>
      </button>
      {open ? (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              className={option.value === value ? 'active' : ''}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function App() {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage());
  const [mobilePane, setMobilePane] = useState<MobilePane>('session');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('overview');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerFilter, setProviderFilter] = useState('all');
  const [sessionQuery, setSessionQuery] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
  const [activeView, setActiveView] = useState<'session' | 'recap'>('session');
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [turnKind, setTurnKind] = useState('all');
  const [turnSearch, setTurnSearch] = useState('');
  const [turnResults, setTurnResults] = useState<SearchHit[]>([]);
  const [highlightTurnId, setHighlightTurnId] = useState<string | null>(null);
  const [recapDays, setRecapDays] = useState(7);
  const [recapData, setRecapData] = useState<RecapResponse | null>(null);
  const [recapMarkdown, setRecapMarkdown] = useState('');
  const [recapCopyLabel, setRecapCopyLabel] = useState('');
  const [analysisTemplates, setAnalysisTemplates] = useState<AnalysisTemplate[]>([]);
  const [analysisLlms, setAnalysisLlms] = useState<AnalysisLlm[]>([]);
  const [analysisTemplateId, setAnalysisTemplateId] = useState('time-diagnosis');
  const [analysisLlmId, setAnalysisLlmId] = useState('claude-p');
  const [analysisPrompt, setAnalysisPrompt] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisMarkdown, setAnalysisMarkdown] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [analysisCopyLabel, setAnalysisCopyLabel] = useState('');
  const [sessionIdCopyLabel, setSessionIdCopyLabel] = useState('');
  const [exportLabel, setExportLabel] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);
  const sessionSearchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const t = useCallback((key: string) => TRANSLATIONS[language][key] || TRANSLATIONS.en[key] || key, [language]);
  const settingsLabel = t('settings');

  const providerOptions = useMemo<SelectOption[]>(() => [
    { value: 'all', label: t('allProviders') },
    ...providers.map((provider) => ({
      value: provider.id,
      label: provider.label || formatProvider(provider.id),
    })),
  ], [providers, t]);

  const languageOptions = useMemo<SelectOption[]>(() => LANGUAGES.map((item) => ({
    value: item.id,
    label: item.label,
  })), []);

  const turnKindOptions = useMemo<SelectOption[]>(() => [
    { value: 'all', label: 'ALL' },
    { value: 'user', label: 'USER' },
    { value: 'assistant', label: 'ASSISTANT' },
    { value: 'reasoning', label: 'REASONING' },
    { value: 'tool_call', label: 'TOOL_CALL' },
    { value: 'tool_result', label: 'TOOL_RESULT' },
    { value: 'hook', label: 'HOOK' },
    { value: 'compacted', label: 'COMPACTED' },
  ], []);

  const analysisTemplateOptions = useMemo<SelectOption[]>(() => {
    if (!analysisTemplates.length) return [{ value: 'time-diagnosis', label: '耗时原因诊断' }];
    return analysisTemplates.map((template) => ({
      value: template.id,
      label: template.title || template.id,
      disabled: template.disabled,
    }));
  }, [analysisTemplates]);

  const analysisLlmOptions = useMemo<SelectOption[]>(() => {
    if (!analysisLlms.length) return [{ value: 'claude-p', label: 'Claude Code CLI' }];
    return analysisLlms.map((llm) => ({
      value: llm.id,
      label: llm.label || llm.id,
      disabled: llm.enabled === false,
    }));
  }, [analysisLlms]);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Non-critical preference persistence.
    }
  }, []);

  const visibleTurns = useMemo(() => {
    if (!detail) return [];
    return turnKind === 'all' ? detail.turns : detail.turns.filter((turn) => turn.kind === turnKind);
  }, [detail, turnKind]);

  const rowVirtualizer = useVirtualizer({
    count: visibleTurns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 176,
    measureElement: (element) => element.getBoundingClientRect().height + 16,
    overscan: 12,
  });

  const recapSections = useMemo(() => renderRecapSections(recapMarkdown), [recapMarkdown]);

  const detailSession = detail?.session || activeSession;
  const activeSummary = detailSession?.summary || activeSession?.summary;
  const detailOverview = useMemo<DetailField[]>(() => {
    if (!detailSession) return [];
    return [
      {
        key: 'session-id',
        label: t('sessionIdLabel'),
        value: detailSession.id || '-',
        valueClassName: 'session-id-value',
      },
      {
        key: 'source',
        label: t('source'),
        value: formatProvider(detailSession.provider),
      },
      {
        key: 'created',
        label: t('created'),
        value: formatDate(detailSession.createdAt),
      },
      {
        key: 'updated',
        label: t('updated'),
        value: formatDate(detailSession.updatedAt),
      },
    ];
  }, [detailSession, t]);

  const detailUsage = useMemo<DetailField[]>(() => [
    { key: 'turns', label: t('turns'), value: formatNumber(detail?.turnsTotal || activeSummary?.turns) },
    { key: 'input', label: t('input'), value: formatNumber(activeSummary?.inputTokens) },
    { key: 'output', label: t('output'), value: formatNumber(activeSummary?.outputTokens) },
    { key: 'cache-read', label: t('cacheRead'), value: formatNumber(activeSummary?.cacheReadTokens) },
    { key: 'cache-write', label: t('cacheWrite'), value: formatNumber(activeSummary?.cacheWriteTokens) },
    { key: 'cost', label: t('cost'), value: metricCost(activeSummary?.costUSD) },
  ], [activeSummary, detail, t]);

  const loadProviders = useCallback(async () => {
    const data = await api<{ providers: ProviderInfo[] }>('/api/providers');
    setProviders(data.providers || []);
  }, []);

  const loadSessions = useCallback(async () => {
    const params = new URLSearchParams({
      limit: String(SESSION_LIMIT),
    });
    if (providerFilter !== 'all') params.set('provider', providerFilter);
    if (sessionQuery.trim()) params.set('q', sessionQuery.trim());
    const data = await api<SessionsResponse>(`/api/sessions?${params.toString()}`);
    setSessions(data.sessions || []);
    setSessionsTotal(data.total || 0);
  }, [providerFilter, sessionQuery]);

  const loadAnalysisTemplates = useCallback(async () => {
    const data = await api<AnalysisTemplatesResponse>('/api/analysis/templates');
    const templates = data.templates || [];
    const llms = data.llms || [];
    setAnalysisTemplates(templates);
    setAnalysisLlms(llms);
    setAnalysisTemplateId((current) => {
      if (templates.some((template) => template.id === current && !template.disabled)) return current;
      return templates.find((template) => !template.disabled)?.id || current;
    });
    setAnalysisLlmId((current) => {
      if (llms.some((llm) => llm.id === current && llm.enabled !== false)) return current;
      return llms.find((llm) => llm.enabled !== false)?.id || current;
    });
  }, []);

  const loadSession = useCallback(async (session: SessionSummary) => {
    setError('');
    setLoading('session');
    setActiveSession(session);
    setActiveView('session');
    setMobilePane('session');
    setTurnSearch('');
    setTurnResults([]);
    setHighlightTurnId(null);
    setAnalysis(null);
    setAnalysisMarkdown('');
    setAnalysisStatus('');
    setSessionIdCopyLabel('');
    setExportLabel('');
    try {
      const params = new URLSearchParams({
        provider: session.provider,
        id: session.id,
        turnLimit: String(TURN_LIMIT),
      });
      const data = await api<SessionDetail>(`/api/session?${params.toString()}`);
      setDetail({
        ...data,
        loadedRanges: data.loadedRange ? [data.loadedRange] : rangesFromTurns(data.turns || []),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading('');
    }
  }, []);

  const loadOlderTurns = useCallback(async () => {
    if (!activeSession || !detail || loading || activeView !== 'session') return;
    const range = oldestRange(detail);
    if (!range || range.start <= 0) return;
    setLoading('older');
    try {
      const params = new URLSearchParams({
        provider: activeSession.provider,
        id: activeSession.id,
        beforeOrdinal: String(range.start),
        limit: String(TURN_LIMIT),
      });
      const page = await api<TurnWindow>(`/api/session/turns?${params.toString()}`);
      setDetail((current) => (current ? mergeWindow(current, page, range.start) : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading('');
    }
  }, [activeSession, activeView, detail, loading]);

  const loadCenteredTurn = useCallback(async (turnId: string) => {
    if (!activeSession || !detail) return;
    setActiveView('session');
    setLoading('jump');
    try {
      const params = new URLSearchParams({
        provider: activeSession.provider,
        id: activeSession.id,
        centerTurnId: turnId,
        before: '80',
        after: '119',
        limit: String(TURN_LIMIT),
      });
      const page = await api<TurnWindow>(`/api/session/turns?${params.toString()}`);
      setDetail((current) => (current ? mergeWindow(current, page, page.target?.ordinal) : current));
      setTurnKind('all');
      setHighlightTurnId(turnId);
      setTurnResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading('');
    }
  }, [activeSession, detail]);

  const runRecap = useCallback(async () => {
    setError('');
    setLoading('recap');
    setActiveView('recap');
    setMobilePane('session');
    setRecapData(null);
    setRecapMarkdown('');
    setRecapCopyLabel('');
    try {
      const params = new URLSearchParams({ days: String(Math.max(1, recapDays)) });
      const data = await api<RecapResponse>(`/api/recap?${params.toString()}`);
      setRecapData(data);
      setRecapMarkdown(data.markdown || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading('');
    }
  }, [recapDays]);

  const copyRecapMarkdown = useCallback(async () => {
    if (!recapMarkdown) return;
    await copyText(recapMarkdown);
    setRecapCopyLabel(t('copied'));
    window.setTimeout(() => setRecapCopyLabel(''), 1200);
  }, [recapMarkdown, t]);

  const showRecapAction = useCallback(() => {
    void runRecap();
  }, [runRecap]);

  const openLatestSession = useCallback(() => {
    const latest = sessions[0];
    if (latest) void loadSession(latest);
  }, [loadSession, sessions]);

  const focusSessionSearch = useCallback(() => {
    setMobilePane('sessions');
    requestAnimationFrame(() => sessionSearchRef.current?.focus());
  }, []);

  const copySessionId = useCallback(async () => {
    if (!detailSession?.id) return;
    await copyText(detailSession.id);
    setSessionIdCopyLabel(t('copied'));
    window.setTimeout(() => setSessionIdCopyLabel(''), 1200);
  }, [detailSession, t]);

  const exportSession = useCallback(async () => {
    if (!detailSession) return;
    setError('');
    setLoading('export');
    setExportLabel('');
    try {
      const params = new URLSearchParams({
        provider: detailSession.provider,
        id: detailSession.id,
        redaction: 'strict',
      });
      const markdown = await apiText(`/api/session/export?${params.toString()}`);
      downloadTextFile(safeDownloadName(detailSession), markdown);
      setExportLabel(t('exported'));
      window.setTimeout(() => setExportLabel(''), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading('');
    }
  }, [detailSession, t]);

  const runAnalysis = useCallback(async () => {
    if (!activeSession || loading === 'analysis') return;
    setError('');
    setLoading('analysis');
    setAnalysis(null);
    setAnalysisMarkdown('');
    setAnalysisCopyLabel('');
    setAnalysisStatus(t('analyzing'));
    try {
      const data = await postJSON<AnalysisResponse>('/api/session/analyze', {
        provider: activeSession.provider,
        id: activeSession.id,
        templateId: analysisTemplateId,
        llmId: analysisLlmId,
        customPrompt: analysisPrompt,
      });
      setAnalysis(data);
      setAnalysisMarkdown(analysisToMarkdown(data, activeSession, analysisTemplateId, analysisLlmId));
      setAnalysisStatus(t('analysisReady'));
    } catch (err) {
      setAnalysisStatus(t('analysisFailed'));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading('');
    }
  }, [activeSession, analysisLlmId, analysisPrompt, analysisTemplateId, loading, t]);

  const copyAnalysisMarkdown = useCallback(async () => {
    if (!analysisMarkdown) return;
    await copyText(analysisMarkdown);
    setAnalysisCopyLabel(t('copied'));
    window.setTimeout(() => setAnalysisCopyLabel(''), 1200);
  }, [analysisMarkdown, t]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setAnalysisMarkdown('');
    setAnalysisStatus('');
    setAnalysisCopyLabel('');
  }, []);

  useEffect(() => {
    loadProviders().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    loadAnalysisTemplates().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [loadAnalysisTemplates, loadProviders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSessions().catch((err) => setError(err instanceof Error ? err.message : String(err)));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [loadSessions]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const closeOnOutside = (event: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setSettingsOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutside);
    return () => window.removeEventListener('pointerdown', closeOnOutside);
  }, [settingsOpen]);

  useEffect(() => {
    if (!activeSession || activeView !== 'session' || turnSearch.trim().length < 2) {
      setTurnResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        provider: activeSession.provider,
        id: activeSession.id,
        q: turnSearch.trim(),
        limit: '50',
      });
      api<SearchResponse>(`/api/session/search?${params.toString()}`)
        .then((data) => setTurnResults(data.hits || []))
        .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeSession, activeView, turnSearch]);

  useEffect(() => {
    const scrollElement = parentRef.current;
    if (!scrollElement) return undefined;
    const handleScroll = () => {
      if (scrollElement.scrollTop < 180) void loadOlderTurns();
    };
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [loadOlderTurns]);

  useEffect(() => {
    if (!highlightTurnId || activeView !== 'session') return;
    const index = visibleTurns.findIndex((turn) => turn.id === highlightTurnId);
    if (index < 0) return;
    requestAnimationFrame(() => rowVirtualizer.scrollToIndex(index, { align: 'center' }));
  }, [activeView, highlightTurnId, rowVirtualizer, visibleTurns]);

  return (
    <div className={`app-shell mobile-pane-${mobilePane} ${activeView === 'recap' ? 'is-recap' : activeSession ? 'has-active-session' : 'is-home'}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">RW</div>
          <div>
            <h1>RunWhy</h1>
            <p>{t('subtitle')}</p>
          </div>
        </div>
        <input
          ref={sessionSearchRef}
          className="session-search"
          type="search"
          aria-label={t('searchSessions')}
          placeholder={t('searchSessions')}
          value={sessionQuery}
          onChange={(event) => setSessionQuery(event.target.value)}
        />
        <div className="topbar-actions">
          <button
            className="primary-action"
            type="button"
            aria-label={t('resumeWork')}
            onClick={() => void runRecap()}
            disabled={loading === 'recap'}
          >
            <span className="primary-action-full">{loading === 'recap' ? t('generating') : t('resumeWork')}</span>
            <span className="primary-action-short">{loading === 'recap' ? t('generating') : t('resumeShort')}</span>
          </button>
          <div ref={settingsRef} className="workspace-settings">
            <button
              className="settings-button"
              type="button"
              aria-label={settingsLabel}
              title={settingsLabel}
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((current) => !current)}
            >
              <span aria-hidden="true">...</span>
            </button>
            {settingsOpen ? (
              <div className="settings-popover" role="dialog" aria-label={t('workspace')}>
                <div className="settings-popover-head">
                  <span>{t('workspace')}</span>
                </div>
                <CustomSelect
                  label={t('providerFilter')}
                  value={providerFilter}
                  options={providerOptions}
                  onChange={setProviderFilter}
                />
                <CustomSelect
                  className="language-switcher"
                  label={t('language')}
                  value={language}
                  options={languageOptions}
                  onChange={(next) => setLanguage(next as Language)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="mobile-pane-tabs" aria-label="Mobile view">
        <button
          className={mobilePane === 'sessions' ? 'active' : ''}
          type="button"
          onClick={() => setMobilePane('sessions')}
        >
          {t('mobileSessions')}
        </button>
        <button
          className={mobilePane === 'session' ? 'active' : ''}
          type="button"
          onClick={() => setMobilePane('session')}
        >
          {t('mobileSession')}
        </button>
        <button
          className={mobilePane === 'inspector' ? 'active' : ''}
          type="button"
          onClick={() => setMobilePane('inspector')}
          disabled={!activeSession}
        >
          {t('mobileInspector')}
        </button>
      </nav>

      <aside className="sessions-pane">
        <div className="pane-head">
          <span>{t('sessions')}</span>
          <strong>{formatNumber(sessionsTotal)}</strong>
        </div>
        <div className="session-list">
          {sessions.map((session) => (
            <button
              key={sessionKey(session)}
              className={`session-row ${activeSession && sessionKey(activeSession) === sessionKey(session) && activeView === 'session' ? 'active' : ''}`}
              type="button"
              onClick={() => void loadSession(session)}
            >
              <span className="session-row-top">
                <span className={`provider provider-${session.provider}`}>{formatProvider(session.provider)}</span>
                <small>{formatDate(session.updatedAt || session.createdAt)}</small>
              </span>
              <strong title={session.title || session.id}>{session.title || session.id}</strong>
              <span title={session.project || session.cwd || session.id}>{session.project || session.cwd || session.id}</span>
              <small>{formatNumber(session.summary?.turns)} {t('turns')}</small>
            </button>
          ))}
        </div>
      </aside>

      <main className="session-pane">
        {activeView === 'recap' ? (
          <section className="recap-view">
            <div className="recap-header">
              <div>
                <span className="provider">{t('recapEyebrow')}</span>
                <h2>{t('recapTitle')}</h2>
                <p>
                  {recapData?.recap
                    ? `${formatNumber(recapData.recap.sessions?.length)} ${t('sessions')} · ${formatNumber(recapData.recap.projects?.length)} ${t('projects')} · ${t('since')} ${formatDate(recapData.recap.since)}`
                    : t('noRecap')}
                </p>
              </div>
              <div className="recap-controls">
                <label>
                  <span>{t('recapDays')}</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={recapDays}
                    onChange={(event) => setRecapDays(Number(event.target.value) || 7)}
                  />
                </label>
                <button type="button" onClick={() => void runRecap()} disabled={loading === 'recap'}>
                  {loading === 'recap' ? t('generating') : t('resumeWork')}
                </button>
                <button type="button" onClick={() => void copyRecapMarkdown()} disabled={!recapMarkdown}>
                  {recapCopyLabel || t('copyMarkdown')}
                </button>
              </div>
            </div>
            <div className="recap-content">
              {recapSections.length ? recapSections.map((section) => (
                <section key={section.slug} className={`recap-section ${section.slug}`}>
                  <h3>{section.title}</h3>
                  <pre>{section.body.trim() || t('noItems')}</pre>
                </section>
              )) : (
                <div className="empty-state inline">
                  <h2>{loading === 'recap' ? t('generating') : t('recapTitle')}</h2>
                  <p>{t('noRecap')}</p>
                </div>
              )}
            </div>
          </section>
        ) : !detail ? (
          loading === 'session' && activeSession ? (
            <section className="session-loading" aria-live="polite">
              <div className="loading-mark" />
              <h2>{t('loadingSession')}</h2>
              <p>{activeSession.title || activeSession.id}</p>
            </section>
          ) : (
          <section className="empty-state">
            <div className="empty-visual" aria-hidden="true">
              <span>RW</span>
            </div>
            <div className="status-strip" aria-label={`${formatNumber(sessionsTotal)} ${t('indexedSessions')}`}>
              <span>{formatNumber(sessionsTotal)} {t('indexedSessions')}</span>
              <span>{providers.length ? providers.map((provider) => provider.label || formatProvider(provider.id)).join(' + ') : 'Codex + Claude Code'}</span>
              <span>{t('localOnly')}</span>
            </div>
            <h2>{t('noSession')}</h2>
            <p>{t('noSessionCopy')}</p>
            <div className="empty-actions empty-action-grid">
              <button className="empty-action-card primary-card" type="button" onClick={showRecapAction} disabled={loading === 'recap'}>
                <strong>{loading === 'recap' ? t('generating') : t('showRecapAction')}</strong>
                <span>{t('recapActionCopy')}</span>
              </button>
              <button className="empty-action-card" type="button" onClick={openLatestSession} disabled={!sessions.length}>
                <strong>{t('latestSessionAction')}</strong>
                <span>{t('latestActionCopy')}</span>
              </button>
              <button className="empty-action-card" type="button" onClick={focusSessionSearch}>
                <strong>{t('searchHistoryAction')}</strong>
                <span>{t('searchActionCopy')}</span>
              </button>
            </div>
          </section>
          )
        ) : (
          <>
            <section className="session-header">
              <div>
                <span className={`provider provider-${detail.session.provider}`}>{formatProvider(detail.session.provider)}</span>
                <h2>{detail.session.title || detail.session.id}</h2>
                <p>{loadedSummary(detail)}{loading === 'older' ? ` · ${t('loadingOlder')}` : ''}</p>
              </div>
              <label>
                <span>{t('type')}</span>
                <CustomSelect
                  value={turnKind}
                  options={turnKindOptions}
                  onChange={setTurnKind}
                />
              </label>
            </section>

            <div ref={parentRef} className="turn-viewport">
                    <div
                      className="turn-list-spacer"
                      style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                    >
                      <div className="turn-list-canvas">
                        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                          const turn = visibleTurns[virtualItem.index];
                          return (
                            <article
                              key={turn.id}
                              ref={rowVirtualizer.measureElement}
                              className={`turn-row turn-kind-${turn.kind} ${highlightTurnId === turn.id ? 'highlight' : ''}`}
                              data-index={virtualItem.index}
                              data-turn-id={turn.id}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                width: 'min(100%, var(--content-max))',
                                transform: `translate(-50%, ${virtualItem.start}px)`,
                              }}
                            >
                      <div className="turn-meta">
                        <span className={`role role-${turn.kind}`}>{turn.kind}</span>
                        <span>#{turn.ordinal + 1}</span>
                        <span>{formatDate(turn.timestamp)}</span>
                      </div>
                      <h3>{turn.title || turn.role || turn.kind}</h3>
                      <p>{turnText(turn) || t('noPayload')}</p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
            </div>
          </>
        )}
      </main>

      <aside className="inspector-pane">
        <div className="pane-head">
          <span>{t('inspector')}</span>
          {loading ? <strong>{loading}</strong> : null}
        </div>
        {error ? <div className="error">{error}</div> : null}
        {!activeSession ? (
          <section className="inspector-empty">
            <span className="section-title">{t('overview')}</span>
            <h3>{t('selectSessionTitle')}</h3>
            <p>{t('selectSessionCopy')}</p>
            <button type="button" onClick={openLatestSession} disabled={!sessions.length}>
              {t('openLatest')}
            </button>
          </section>
        ) : (
          <>
        <div className="inspector-tabs" role="tablist" aria-label={t('inspector')}>
          {(['overview', 'search', 'analysis'] as InspectorTab[]).map((tab) => (
            <button
              key={tab}
              className={inspectorTab === tab ? 'active' : ''}
              type="button"
              role="tab"
              aria-selected={inspectorTab === tab}
              onClick={() => setInspectorTab(tab)}
            >
              {tab === 'overview' ? t('overviewTab') : tab === 'search' ? t('searchTab') : tab === 'analysis' ? t('analysisTab') : t(tab)}
            </button>
          ))}
        </div>

        {inspectorTab === 'overview' ? (
          <section className="detail-panel inspector-section" aria-label={t('detailOverview')}>
            <section className="detail-section">
              <div className="section-title">{t('detailOverview')}</div>
              <dl className="detail-list">
                {detailOverview.map((field) => (
                  <div key={field.key} className="detail-row">
                    <dt>{field.label}</dt>
                    <dd className={field.valueClassName} title={field.value}>{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="detail-section">
              <div className="section-title">{t('detailUsage')}</div>
              <dl className="detail-list">
                {detailUsage.map((field) => (
                  <div key={field.key} className="detail-row">
                    <dt>{field.label}</dt>
                    <dd>{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="detail-section">
              <div className="section-title">{t('detailActions')}</div>
              <div className="detail-actions">
                <button type="button" onClick={() => void copySessionId()} disabled={!detailSession?.id}>
                  {sessionIdCopyLabel || t('copySessionId')}
                </button>
                <button type="button" onClick={() => void exportSession()} disabled={!detailSession || loading === 'export'}>
                  {exportLabel || t('exportSession')}
                </button>
              </div>
            </section>
          </section>
        ) : null}

        {inspectorTab === 'search' ? (
          <section className="turn-search-panel inspector-section">
            <label>
              <span>{t('searchTurns')}</span>
              <input
                type="search"
                placeholder={t('searchFullSession')}
                value={turnSearch}
                disabled={!activeSession || activeView !== 'session'}
                onChange={(event) => setTurnSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setTurnResults([]);
                }}
              />
            </label>
            <div className="turn-search-results">
              {turnResults.map((hit) => (
                <button key={`${hit.turnId}:${hit.ordinal}`} type="button" onClick={() => void loadCenteredTurn(hit.turnId)}>
                  <span className={`role role-${hit.kind}`}>{hit.kind}</span>
                  <strong>#{hit.ordinal + 1}</strong>
                  <span>{hit.snippet || hit.title || hit.turnId}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

            {inspectorTab === 'analysis' ? (
              <section className="analysis-panel inspector-section">
            <div className="section-title">{t('analysis')}</div>
            <div className="analysis-controls">
              <CustomSelect
                value={analysisTemplateId}
                options={analysisTemplateOptions}
                onChange={setAnalysisTemplateId}
              />
              <CustomSelect
                value={analysisLlmId}
                options={analysisLlmOptions}
                onChange={setAnalysisLlmId}
              />
              <textarea
                placeholder={t('focusPlaceholder')}
                value={analysisPrompt}
                onChange={(event) => setAnalysisPrompt(event.target.value)}
              />
              <div className="analysis-actions">
                <button type="button" onClick={() => void runAnalysis()} disabled={!activeSession || loading === 'analysis'}>
                  {loading === 'analysis' ? t('analyzing') : t('analyze')}
                </button>
                <button type="button" onClick={() => void copyAnalysisMarkdown()} disabled={!analysisMarkdown}>
                  {analysisCopyLabel || t('copyMarkdown')}
                </button>
                <button type="button" onClick={clearAnalysis} disabled={!analysis && !analysisStatus}>
                  {t('clear')}
                </button>
              </div>
            </div>
            <div className="analysis-result">
              {!activeSession ? (
                <p className="dim">{t('selectLoaded')}</p>
              ) : analysis ? (
                <>
                  <section className="diagnosis-hero">
                    <span>{t('primaryDiagnosis')}</span>
                    <h4>{titleCaseCategory(analysis.result?.topDelaySegments?.[0]?.category || analysis.result?.rootCauses?.[0]?.cause)}</h4>
                    <p>{analysis.result?.summary || t('noAnalysis')}</p>
                    <div className="diagnosis-meta">
                      <span>{t('confidence')} {analysis.result?.confidence || analysis.result?.topDelaySegments?.[0]?.confidence || '-'}</span>
                      <span>{analysis.localChecks?.fallbackUsed ? t('fallbackUsed') : 'LLM structured'}</span>
                    </div>
                  </section>
                  <div className="analysis-kpis">
                    <div><span>{t('total')}</span><b>{formatDuration(analysis.result?.duration?.totalMs)}</b></div>
                    <div><span>{t('active')}</span><b>{formatDuration(analysis.result?.duration?.activeMs)}</b></div>
                    <div><span>{t('idle')}</span><b>{formatDuration(analysis.result?.duration?.idleMs)}</b></div>
                  </div>
                  {(analysis.result?.topDelaySegments || []).length ? (
                    <div className="analysis-list">
                      <h4>{t('delaySegments')}</h4>
                      {(analysis.result?.topDelaySegments || []).slice(0, 4).map((segment, index) => (
                        <article key={`${segment.category}:${index}`} className="analysis-item">
                          <strong>{titleCaseCategory(segment.category)} · {formatDuration(segment.durationMs)}</strong>
                          <p>{segment.explanation}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {(analysis.result?.rootCauses || []).length ? (
                    <div className="analysis-list">
                      <h4>{t('rootCauses')}</h4>
                      {(analysis.result?.rootCauses || []).slice(0, 4).map((cause, index) => (
                        <article key={`${cause.cause}:${index}`} className="analysis-item">
                          <strong>{cause.cause}</strong>
                          <p>{cause.recommendation}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {(analysis.result?.unknowns || []).length ? (
                    <div className="analysis-list">
                      <h4>{t('unknowns')}</h4>
                      <ul>{analysis.result?.unknowns?.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="dim">{analysisStatus || t('noAnalysis')}</p>
              )}
            </div>
          </section>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
