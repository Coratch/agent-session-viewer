const fs = require('node:fs');
const path = require('node:path');

const { addUsage, emptySummary, normalizeUsage } = require('../model/normalize');
const { costFromUsage, messageBlocksToText } = require('../model/pricing');

function createClaudeCodeProvider({ rootDir }) {
  return {
    id: 'claude-code',
    label: 'Claude Code',
    rootDir,
    listSessions(options = {}) {
      const limit = positiveLimit(options.limit);
      const entries = listSessionFiles(rootDir);
      return (limit ? entries.slice(0, limit) : entries).map((entry) => summarizeSessionFile(entry));
    },
    countSessions() {
      return listSessionFiles(rootDir).length;
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
  if (!rootDir || !fs.existsSync(rootDir)) return out;
  for (const project of safeReadDir(rootDir)) {
    const projectDir = path.join(rootDir, project);
    if (!safeStat(projectDir)?.isDirectory()) continue;
    for (const name of safeReadDir(projectDir)) {
      if (!name.endsWith('.jsonl')) continue;
      const file = path.join(projectDir, name);
      const stat = safeStat(file);
      if (!stat?.isFile()) continue;
      out.push({
        id: path.basename(name, '.jsonl'),
        provider: 'claude-code',
        project,
        file,
        mtime: stat.mtime.toISOString(),
        size: stat.size,
      });
    }
  }
  out.sort((a, b) => b.mtime.localeCompare(a.mtime));
  return out;
}

function findSessionFile(rootDir, id) {
  return listSessionFiles(rootDir).find((entry) => entry.id === id) || null;
}

function summarizeSessionFile(entry) {
  const summary = emptySummary();
  summary.costUSD = 0;
  let createdAt = null;
  let updatedAt = null;
  let title = null;
  let cwd = null;
  let model = null;
  const meta = {};

  for (const line of readJsonl(entry.file)) {
    if (line.timestamp) {
      createdAt ||= line.timestamp;
      updatedAt = line.timestamp;
    }
    if (line.cwd && !cwd) cwd = line.cwd;
    if (line.entrypoint && !meta.entrypoint) meta.entrypoint = line.entrypoint;
    if (line.version && !meta.version) meta.version = line.version;
    if (line.permissionMode && !meta.permissionMode) meta.permissionMode = line.permissionMode;
    if (line.gitBranch && !meta.gitBranch) meta.gitBranch = line.gitBranch;
    if (line.type === 'custom-title' && line.customTitle) meta.customTitle = line.customTitle;
    if (line.type === 'agent-name' && line.agentName) meta.agentName = line.agentName;
    if (line.isSidechain) meta.isSidechain = true;

    if (line.type === 'user' && line.message && !line.isMeta && !title) {
      const text = claudeMessageText(line.message).trim();
      if (text && !text.startsWith('<')) title = text.slice(0, 120);
    }

    if (line.type === 'assistant' && line.message) {
      model = line.message.model || model;
      if (line.message.usage) {
        addUsage(summary, line.message.usage, costFromUsage(line.message.model, line.message.usage));
      }
    }
  }

  return {
    id: entry.id,
    provider: 'claude-code',
    project: entry.project,
    title: meta.customTitle || title || entry.id.slice(0, 8),
    file: entry.file,
    createdAt,
    updatedAt: updatedAt || entry.mtime,
    model,
    cwd,
    summary,
    meta: {
      ...meta,
      startupKind: meta.agentName || meta.isSidechain
        ? 'agent'
        : meta.entrypoint === 'sdk-cli'
          ? 'sdk'
          : 'cli',
    },
  };
}

function readTurns(entry) {
  const turns = [];
  for (const line of readJsonl(entry.file)) {
    if (line.type === 'user' && line.message && !line.isMeta) {
      turns.push(...claudeMessageTurns(entry, line, turns.length));
    } else if (line.type === 'assistant' && line.message) {
      turns.push(...claudeMessageTurns(entry, line, turns.length));
    } else if (line.type === 'attachment' && line.attachment) {
      const attachment = line.attachment;
      turns.push({
        id: line.uuid || `${entry.id}:${turns.length}`,
        provider: 'claude-code',
        kind: attachment.type === 'hook' ? 'hook' : 'attachment',
        timestamp: line.timestamp,
        title: attachment.hookName || attachment.toolName || attachment.type || 'attachment',
        text: String(attachment.content || attachment.stdout || '').slice(0, 4000),
        raw: line,
        meta: {
          attachmentType: attachment.type,
          hookEvent: attachment.hookEvent,
          toolName: attachment.toolName,
          exitCode: attachment.exitCode,
        },
      });
    }
  }
  return turns;
}

function claudeMessageText(message) {
  if (!message) return '';
  return messageBlocksToText(message.content);
}

function claudeMessageTurns(entry, line, baseIndex) {
  const message = line.message || {};
  const role = message.role || line.type;
  const blocks = normalizeClaudeBlocks(message.content);
  const items = [];
  let usageAssigned = false;

  blocks.forEach((block, blockIndex) => {
    const item = claudeBlockTurn(block, role, message, line, usageAssigned);
    if (!item) return;
    if (item.usage) usageAssigned = true;
    items.push({ ...item, blockIndex });
  });

  if (!items.length) return [];

  return items.map((item, index) => ({
    id: turnId(entry, line, baseIndex + index, items.length === 1 ? null : item.blockIndex),
    provider: 'claude-code',
    timestamp: line.timestamp,
    raw: line,
    ...withoutBlockIndex(item),
  }));
}

function claudeBlockTurn(block, role, message, line, usageAssigned) {
  if (!block || typeof block !== 'object') return null;
  if (block.type === 'text') {
    const kind = role === 'assistant' ? 'assistant' : 'user';
    return withAssistantUsage({
      kind,
      title: kind,
      text: block.text || '',
      meta: claudeAttributionMeta(line, message),
    }, role, message, usageAssigned);
  }

  if (block.type === 'thinking') {
    return {
      kind: 'reasoning',
      title: 'reasoning',
      text: block.thinking || block.text || '',
      meta: claudeAttributionMeta(line, message),
    };
  }

  if (block.type === 'tool_use') {
    const name = block.name || 'tool_call';
    return {
      kind: 'tool_call',
      title: name,
      text: [name, formatJson(block.input)].filter(Boolean).join(' '),
      meta: {
        ...claudeAttributionMeta(line, message),
        toolName: block.name,
        toolUseId: block.id,
      },
    };
  }

  if (block.type === 'tool_result') {
    return {
      kind: 'tool_result',
      title: block.tool_use_id || block.name || 'tool_result',
      text: claudeBlockContentText(block.content),
      meta: {
        ...claudeAttributionMeta(line, message),
        toolUseId: block.tool_use_id,
        isError: block.is_error,
      },
    };
  }

  if (block.type === 'image') {
    return {
      kind: 'attachment',
      title: 'image',
      text: '[image]',
      meta: claudeAttributionMeta(line, message),
    };
  }

  return {
    kind: role === 'assistant' ? 'assistant' : 'user',
    title: block.type || role,
    text: claudeBlockContentText(block.content) || formatJson(block),
    meta: claudeAttributionMeta(line, message),
  };
}

function withAssistantUsage(item, role, message, usageAssigned) {
  if (role !== 'assistant' || usageAssigned) return item;
  const usage = normalizeUsage(message.usage || {});
  return {
    ...item,
    usage,
    costUSD: costFromUsage(message.model, message.usage || {}),
  };
}

function claudeAttributionMeta(line, message) {
  return {
    model: message.model,
    skill: line.attributionSkill,
    plugin: line.attributionPlugin,
  };
}

function normalizeClaudeBlocks(content) {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  if (!Array.isArray(content)) return [];
  return content.map((block) => typeof block === 'string' ? { type: 'text', text: block } : block);
}

function claudeBlockContentText(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((part) => {
    if (typeof part === 'string') return part;
    if (!part || typeof part !== 'object') return '';
    if (part.type === 'text') return part.text || '';
    if (part.type === 'image') return '[image]';
    return claudeBlockContentText(part.content) || formatJson(part);
  }).filter(Boolean).join('\n\n');
  if (typeof content.text === 'string') return content.text;
  return formatJson(content);
}

function formatJson(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function turnId(entry, line, index, blockIndex) {
  if (!line.uuid) return `${entry.id}:${index}`;
  if (blockIndex == null) return line.uuid;
  return `${line.uuid}:${blockIndex}`;
}

function withoutBlockIndex(item) {
  const { blockIndex, ...rest } = item;
  return rest;
}

function readJsonl(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // Ignore partial or corrupted lines; Claude Code can write while active.
    }
  }
  return out;
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

function positiveLimit(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

module.exports = {
  createClaudeCodeProvider,
};
