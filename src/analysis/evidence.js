const { redactText } = require('../redaction');

const DEFAULT_PREVIEW_LIMIT = 1200;
const DEFAULT_IDLE_GAP_MS = 5 * 60 * 1000;

function buildEvidencePack(detail, options = {}) {
  const redactionLevel = options.redactionLevel || 'strict';
  const previewLimit = options.previewLimit || DEFAULT_PREVIEW_LIMIT;
  const idleGapMs = options.idleGapMs || DEFAULT_IDLE_GAP_MS;
  const turns = (detail.turns || []).map((turn) => ({
    id: turn.id,
    provider: turn.provider,
    kind: turn.kind,
    timestamp: turn.timestamp || '',
    title: redactText(turn.title || '', { level: redactionLevel }),
    textPreview: redactText(compact(turn.text || '', previewLimit), { level: redactionLevel }),
    redactionApplied: redactionLevel,
  }));

  return {
    session: sanitizeSession(detail.session || {}, redactionLevel),
    trustedMetrics: computeTrustedMetrics(turns, detail.session || {}, idleGapMs),
    turns,
    warnings: collectWarnings(turns),
  };
}

function sanitizeSession(session, redactionLevel) {
  return {
    provider: session.provider || '',
    id: session.id || '',
    title: redactText(session.title || '', { level: redactionLevel }),
    project: redactText(session.project || '', { level: redactionLevel }),
    createdAt: session.createdAt || '',
    updatedAt: session.updatedAt || '',
    model: session.model || '',
    summary: session.summary || {},
  };
}

function computeTrustedMetrics(turns, session, idleGapMs = DEFAULT_IDLE_GAP_MS) {
  const timestamps = turns.map((turn) => parseTime(turn.timestamp)).filter((n) => n != null);
  const first = parseTime(session.createdAt) ?? timestamps[0] ?? null;
  const last = parseTime(session.updatedAt) ?? timestamps[timestamps.length - 1] ?? first;
  const gaps = [];
  let activeDurationMs = 0;
  let idleDurationMs = 0;
  for (let index = 1; index < turns.length; index += 1) {
    const prev = parseTime(turns[index - 1].timestamp);
    const next = parseTime(turns[index].timestamp);
    if (prev == null || next == null || next < prev) continue;
    const durationMs = next - prev;
    const toolExecution = turns[index - 1].kind === 'tool_call' && turns[index].kind === 'tool_result';
    const gap = {
      fromTurnId: turns[index - 1].id,
      toTurnId: turns[index].id,
      durationMs,
      idle: !toolExecution && durationMs >= idleGapMs,
      category: toolExecution ? 'tool_execution' : durationMs >= idleGapMs ? 'user_idle' : 'turn_gap',
    };
    gaps.push(gap);
    if (gap.idle) idleDurationMs += durationMs;
    else activeDurationMs += durationMs;
  }

  return {
    totalDurationMs: first != null && last != null && last >= first ? last - first : 0,
    activeDurationMs,
    idleDurationMs,
    largestGaps: gaps.sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
    turnKindCounts: countByKind(turns),
  };
}

function collectWarnings(turns) {
  const risky = /ignore previous instructions|system prompt|developer message/i;
  return turns
    .filter((turn) => risky.test(`${turn.title}\n${turn.textPreview}`))
    .map((turn) => ({ turnId: turn.id, kind: 'prompt_injection_phrase' }));
}

function countByKind(turns) {
  const counts = {};
  for (const turn of turns) counts[turn.kind] = (counts[turn.kind] || 0) + 1;
  return counts;
}

function parseTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function compact(value, limit) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

module.exports = {
  buildEvidencePack,
  computeTrustedMetrics,
};
