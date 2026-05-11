const fs = require('node:fs');
const path = require('node:path');

const { createDefaultProviders, createRegistry } = require('./registry');
const { redactText } = require('./redaction');

function createRecap(config, options = {}) {
  const now = options.now || new Date();
  const since = recapSince(config, now);
  const registry = createRegistry(createDefaultProviders(config));
  const providerFilter = (config.providers || []).join(',') || 'all';
  const sessions = registry
    .listSessions(providerFilter)
    .filter((session) => inRange(session, since))
    .filter((session) => matchesProject(session, config.project))
    .map((session) => registry.readSession(session.provider, session.id))
    .filter(Boolean);

  const recap = {
    generatedAt: now.toISOString(),
    since: since.toISOString(),
    sessions: sessions.map((detail) => detail.session),
    projects: [],
    completed: [],
    openThreads: [],
    commands: [],
    files: [],
    keyDecisions: [],
    nextActions: [],
  };

  const projects = new Map();
  for (const detail of sessions) {
    collectProject(projects, detail.session);
    collectTurns(recap, detail);
  }

  recap.projects = [...projects.values()]
    .map((project) => ({
      ...project,
      providers: [...project.providers].sort(),
      sessions: project.sessions,
    }))
    .sort((a, b) => String(b.lastActiveAt || '').localeCompare(String(a.lastActiveAt || '')));

  if (!recap.openThreads.length) {
    recap.openThreads.push('No obvious open threads found in the selected range.');
  }
  if (!recap.nextActions.length) {
    const names = recap.projects.map((project) => project.name).slice(0, 3);
    recap.nextActions.push(names.length
      ? `Review recent work in ${names.join(', ')} and choose the next roadmap item.`
      : 'Run a broader recap range or open recent sessions to choose the next task.');
  }

  return recap;
}

function recapSince(config, now) {
  if (config.since) return new Date(config.since);
  if (config.demo && !config.daysExplicit) return new Date(0);
  return new Date(now.getTime() - (config.days || 7) * 24 * 60 * 60 * 1000);
}

function renderRecapMarkdown(recap) {
  return [
    '# Pick Up Where I Left Off',
    '',
    `Generated: ${redactText(recap.generatedAt)}`,
    `Range start: ${redactText(recap.since)}`,
    '',
    '## Summary',
    '',
    summaryText(recap),
    '',
    '## Active Projects',
    '',
    list(recap.projects.map((project) => {
      const parts = [
        `providers: ${project.providers.join(', ')}`,
        project.cwd ? `cwd: ${project.cwd}` : '',
        project.branch ? `branch: ${project.branch}` : '',
        project.lastActiveAt ? `last active: ${project.lastActiveAt}` : '',
      ].filter(Boolean);
      return `${project.name} (${parts.join('; ')})`;
    })),
    '',
    '## Completed',
    '',
    list(recap.completed),
    '',
    '## Open Threads',
    '',
    list(recap.openThreads),
    '',
    '## Commands And Files',
    '',
    list([
      ...recap.commands.map((command) => `command: ${command}`),
      ...recap.files.map((file) => `file: ${file}`),
    ]),
    '',
    '## Key Decisions',
    '',
    list(recap.keyDecisions),
    '',
    '## Next Actions',
    '',
    numbered(recap.nextActions),
    '',
  ].join('\n');
}

function writeRecap(config) {
  const recap = createRecap(config);
  const markdown = renderRecapMarkdown(recap);
  if (config.outFile) {
    fs.writeFileSync(config.outFile, markdown, 'utf8');
  } else {
    process.stdout.write(markdown);
  }
}

function inRange(session, since) {
  const timestamp = session.updatedAt || session.createdAt;
  if (!timestamp) return true;
  return new Date(timestamp).getTime() >= since.getTime();
}

function matchesProject(session, projectFilter) {
  if (!projectFilter) return true;
  const needle = String(projectFilter).toLowerCase();
  return [
    session.project,
    session.cwd,
    session.title,
  ].some((value) => String(value || '').toLowerCase().includes(needle));
}

function collectProject(projects, session) {
  const name = redactText(session.project || projectFromCwd(session.cwd) || session.provider);
  const project = projects.get(name) || {
    name,
    providers: new Set(),
    cwd: redactText(session.cwd || ''),
    branch: session.meta?.gitBranch || '',
    lastActiveAt: session.updatedAt,
    sessions: 0,
  };
  project.providers.add(session.provider);
  project.sessions += 1;
  if (session.updatedAt && String(session.updatedAt).localeCompare(String(project.lastActiveAt || '')) > 0) {
    project.lastActiveAt = session.updatedAt;
  }
  if (!project.cwd && session.cwd) project.cwd = redactText(session.cwd);
  if (!project.branch && session.meta?.gitBranch) project.branch = session.meta.gitBranch;
  projects.set(name, project);
}

function collectTurns(recap, detail) {
  let completed = false;
  let lastTurn = null;
  for (const turn of detail.turns || []) {
    lastTurn = turn;
    const text = redactText(turn.text || '');
    const label = `${detail.session.title || detail.session.id}: ${compact(text || turn.title || turn.kind)}`;

    if (isCommandTurn(turn)) pushUnique(recap.commands, commandText(turn, text));
    for (const file of fileHints(turn, text)) pushUnique(recap.files, file);
    if (isCompleted(turn, text)) {
      completed = true;
      pushUnique(recap.completed, label);
    }
    if (isDecision(text)) pushUnique(recap.keyDecisions, label);
  }

  if (!completed && lastTurn) {
    pushUnique(
      recap.openThreads,
      `${detail.session.title || detail.session.id}: ${compact(redactText(lastTurn.text || lastTurn.title || 'Review latest turn'))}`,
    );
    pushUnique(
      recap.nextActions,
      `Resume ${detail.session.project || detail.session.title || detail.session.id} from the latest open thread.`,
    );
  }
}

function isCommandTurn(turn) {
  return turn.kind === 'tool_call' || /exec_command|bash|shell|npm|git|rg/.test(`${turn.title || ''} ${turn.text || ''}`);
}

function commandText(turn, text) {
  return compact(`${turn.title || turn.kind} ${text}`);
}

function fileHints(turn, text) {
  const out = [];
  const content = `${turn.title || ''}\n${text}`;
  const regex = /(?:[\w.-]+\/)+(?:[\w.-]+)/g;
  for (const match of content.match(regex) || []) {
    if (!match.includes('://')) out.push(redactText(match));
  }

  const rawContent = turn.raw?.message?.content;
  if (Array.isArray(rawContent)) {
    for (const block of rawContent) {
      if (block?.input?.file_path) out.push(redactText(block.input.file_path));
    }
  }
  return out;
}

function isCompleted(turn, text) {
  return (
    /task_complete/.test(text) ||
    /\b(?:passed|success|successful|published|complete|completed)\b/i.test(text)
  );
}

function isDecision(text) {
  return /\b(?:decided|choose|chose|scoped|positioning|package name|version|release)\b/i.test(text) ||
    /(?:决定|选择|定位|版本|发布|范围)/.test(text);
}

function summaryText(recap) {
  if (!recap.sessions.length) return 'No sessions found in the selected range.';
  const providers = [...new Set(recap.sessions.map((session) => session.provider))].sort().join(', ');
  return `Found ${recap.sessions.length} sessions across ${recap.projects.length} active projects from ${providers}.`;
}

function list(items) {
  const filtered = items.filter(Boolean).slice(0, 20);
  if (!filtered.length) return '- No items found.';
  return filtered.map((item) => `- ${redactText(item)}`).join('\n');
}

function numbered(items) {
  const filtered = items.filter(Boolean).slice(0, 3);
  if (!filtered.length) return '1. Review recent sessions and choose the next task.';
  return filtered.map((item, index) => `${index + 1}. ${redactText(item)}`).join('\n');
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

function uniqueLine(list, value) {
  const clean = redactText(compact(value));
  return list.includes(clean) ? '' : clean;
}

function pushUnique(list, value) {
  const clean = uniqueLine(list, value);
  if (clean) list.push(clean);
}

function projectFromCwd(cwd) {
  if (!cwd) return '';
  return path.basename(cwd);
}

module.exports = {
  createRecap,
  renderRecapMarkdown,
  writeRecap,
};
