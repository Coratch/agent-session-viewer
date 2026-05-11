const fs = require('node:fs');
const path = require('node:path');

const { emptySummary } = require('../model/normalize');

function createCodexProvider({ rootDir }) {
  return {
    id: 'codex',
    label: 'Codex',
    rootDir,
    listSessions() {
      return listSessionFiles(rootDir).map((entry) => summarizeSessionFile(entry));
    },
    readSession(id) {
      const entry = findSessionFile(rootDir, id);
      if (!entry) throw new Error(`Unknown session: ${id}`);
      return {
        session: summarizeSessionFile(entry),
        turns: readTurns(entry),
      };
    },
  };
}

function listSessionFiles(rootDir) {
  const out = [];
  walk(rootDir, (file, stat) => {
    if (!file.endsWith('.jsonl')) return;
    out.push({
      id: path.basename(file, '.jsonl'),
      provider: 'codex',
      project: null,
      file,
      mtime: stat.mtime.toISOString(),
      size: stat.size,
    });
  });
  out.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return out;
}

function findSessionFile(rootDir, id) {
  return listSessionFiles(rootDir).find((entry) => entry.id === id) || null;
}

function summarizeSessionFile(entry) {
  const summary = emptySummary();
  let createdAt = null;
  let updatedAt = null;
  let title = null;
  let model = null;
  let cwd = null;
  const meta = {};

  for (const line of readJsonl(entry.file)) {
    const payload = line.payload || {};
    const payloadType = payload.type;
    if (line.timestamp) {
      createdAt ||= line.timestamp;
      updatedAt = line.timestamp;
    }

    if (line.type === 'session_meta') {
      cwd ||= payload.cwd;
      meta.sessionId = payload.id;
      meta.originator = payload.originator;
      meta.cliVersion = payload.cli_version;
      meta.source = payload.source;
      meta.modelProvider = payload.model_provider;
      if (payload.git?.branch) meta.gitBranch = payload.git.branch;
    } else if (line.type === 'turn_context') {
      cwd ||= payload.cwd;
      model ||= payload.model;
      meta.effort = payload.effort;
      meta.collaborationMode = payload.collaboration_mode;
      meta.approvalPolicy = payload.approval_policy;
      meta.sandboxPolicy = payload.sandbox_policy;
    } else if (line.type === 'event_msg' && payloadType === 'user_message' && !title) {
      title = codexUserMessageText(payload).slice(0, 120);
    } else if (isAssistantMessage(line)) {
      summary.turns += 1;
    }
  }

  return {
    id: entry.id,
    provider: 'codex',
    project: projectFromCwd(cwd) || 'codex',
    title: title || entry.id.slice(0, 8),
    file: entry.file,
    createdAt,
    updatedAt: updatedAt || entry.mtime,
    model,
    cwd,
    summary,
    meta,
  };
}

function readTurns(entry) {
  const turns = [];
  for (const line of readJsonl(entry.file)) {
    const payload = line.payload || {};
    const payloadType = payload.type;
    if (line.type === 'event_msg' && payloadType === 'user_message') {
      turns.push(turn(entry, turns, line, 'user', 'user', codexUserMessageText(payload)));
    } else if (line.type === 'event_msg' && payloadType === 'agent_message') {
      turns.push(turn(entry, turns, line, 'assistant', 'agent', String(payload.message || '')));
    } else if (line.type === 'response_item' && payloadType === 'message') {
      turns.push(turn(entry, turns, line, payload.role === 'user' ? 'user' : 'assistant', payload.role || 'message', contentToText(payload.content)));
    } else if (line.type === 'response_item' && payloadType === 'reasoning') {
      const text = contentToText(payload.summary) || contentToText(payload.content);
      turns.push(turn(entry, turns, line, 'reasoning', 'reasoning', text));
    } else if (line.type === 'response_item' && payloadType === 'function_call') {
      const args = typeof payload.arguments === 'string'
        ? payload.arguments
        : JSON.stringify(payload.arguments || {});
      turns.push(turn(entry, turns, line, 'tool_call', payload.name || 'tool_call', `${payload.name || 'tool'} ${args}`.trim(), {
        callId: payload.call_id,
      }));
    } else if (line.type === 'response_item' && payloadType === 'function_call_output') {
      turns.push(turn(entry, turns, line, 'tool_result', payload.call_id || 'tool_result', stringifyOutput(payload.output), {
        callId: payload.call_id,
      }));
    } else if (line.type === 'event_msg' && isDisplayEvent(payloadType)) {
      turns.push(turn(entry, turns, line, 'event', payloadType || 'event', eventText(payload)));
    }
  }
  return turns;
}

function turn(entry, turns, line, kind, title, text, meta = {}) {
  return {
    id: `${entry.id}:${turns.length}`,
    provider: 'codex',
    kind,
    timestamp: line.timestamp,
    title,
    text: text || '',
    raw: line,
    meta,
  };
}

function isAssistantMessage(line) {
  const payload = line.payload || {};
  return (
    (line.type === 'event_msg' && payload.type === 'agent_message') ||
    (line.type === 'response_item' && payload.type === 'message' && payload.role !== 'user')
  );
}

function isDisplayEvent(type) {
  return Boolean(type && !['user_message', 'agent_message', 'token_count'].includes(type));
}

function codexUserMessageText(payload) {
  if (payload.message) return String(payload.message);
  return contentToText(payload.text_elements);
}

function contentToText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) {
    if (typeof content.text === 'string') return content.text;
    if (typeof content.summary === 'string') return content.summary;
    return JSON.stringify(content);
  }
  return content.map(contentPartToText).filter(Boolean).join('\n\n');
}

function contentPartToText(part) {
  if (typeof part === 'string') return part;
  if (!part || typeof part !== 'object') return '';
  if (typeof part.text === 'string') return part.text;
  if (typeof part.summary === 'string') return part.summary;
  if (part.type === 'input_text' || part.type === 'output_text' || part.type === 'summary_text') {
    return part.text || '';
  }
  return `[${part.type || 'content'}]`;
}

function stringifyOutput(output) {
  if (output == null) return '';
  if (typeof output === 'string') return output;
  return JSON.stringify(output, null, 2);
}

function eventText(payload) {
  const copy = { ...payload };
  return JSON.stringify(copy, null, 2);
}

function projectFromCwd(cwd) {
  if (!cwd) return null;
  return path.basename(cwd);
}

function readJsonl(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Ignore partial lines in active Codex logs.
    }
  }
  return out;
}

function walk(rootDir, visit) {
  if (!rootDir || !fs.existsSync(rootDir)) return;
  const entries = safeReadDir(rootDir);
  for (const name of entries) {
    const file = path.join(rootDir, name);
    const stat = safeStat(file);
    if (!stat) continue;
    if (stat.isDirectory()) walk(file, visit);
    else if (stat.isFile()) visit(file, stat);
  }
}

function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function safeStat(file) {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
}

module.exports = {
  createCodexProvider,
};
