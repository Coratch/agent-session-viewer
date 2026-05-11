const fs = require('node:fs');
const path = require('node:path');

const { addUsage, emptySummary, normalizeUsage } = require('../model/normalize');
const { costFromUsage, messageBlocksToText } = require('../model/pricing');

function createClaudeCodeProvider({ rootDir }) {
  return {
    id: 'claude-code',
    label: 'Claude Code',
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
      turns.push({
        id: line.uuid || `${entry.id}:${turns.length}`,
        provider: 'claude-code',
        kind: 'user',
        timestamp: line.timestamp,
        title: 'user',
        text: claudeMessageText(line.message),
        raw: line,
      });
    } else if (line.type === 'assistant' && line.message) {
      const usage = normalizeUsage(line.message.usage || {});
      turns.push({
        id: line.uuid || `${entry.id}:${turns.length}`,
        provider: 'claude-code',
        kind: 'assistant',
        timestamp: line.timestamp,
        title: line.message.model || 'assistant',
        text: claudeMessageText(line.message),
        raw: line,
        usage,
        costUSD: costFromUsage(line.message.model, line.message.usage || {}),
        meta: {
          model: line.message.model,
          skill: line.attributionSkill,
          plugin: line.attributionPlugin,
        },
      });
    } else if (line.type === 'attachment' && line.attachment) {
      const attachment = line.attachment;
      turns.push({
        id: line.uuid || `${entry.id}:${turns.length}`,
        provider: 'claude-code',
        kind: 'attachment',
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

module.exports = {
  createClaudeCodeProvider,
};
