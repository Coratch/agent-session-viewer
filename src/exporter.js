const fs = require('node:fs');

const { createDefaultProviders, createRegistry } = require('./registry');
const { redactText } = require('./redaction');

function createSessionExport(config) {
  const providerId = singleProvider(config.providers);
  if (!config.sessionId) throw new Error('export requires --id <session-id>');

  const registry = createRegistry(createDefaultProviders(config));
  const detail = registry.readSession(providerId, config.sessionId);
  if (!detail) throw new Error(`Unknown session: ${providerId}/${config.sessionId}`);

  return {
    generatedAt: new Date().toISOString(),
    redactionLevel: config.redactionLevel || 'basic',
    session: detail.session,
    turns: detail.turns || [],
  };
}

function renderSessionMarkdown(sessionExport, options = {}) {
  const level = options.redactionLevel || sessionExport.redactionLevel || 'basic';
  const session = sessionExport.session;
  const lines = [
    '# Agent Session Export',
    '',
    metadataLine('Generated', sessionExport.generatedAt, level),
    metadataLine('Provider', session.provider, level),
    metadataLine('Session ID', session.id, level),
    metadataLine('Project', session.project, level),
    metadataLine('Title', session.title, level),
    metadataLine('Created', session.createdAt, level),
    metadataLine('Updated', session.updatedAt, level),
    metadataLine('CWD', session.cwd, level),
    metadataLine('Branch', session.meta?.gitBranch, level),
    metadataLine('Model', session.model, level),
    '',
    '## Turns',
    '',
  ].filter((line) => line !== null);

  const turns = sessionExport.turns || [];
  if (!turns.length) {
    lines.push('- No turns found.');
    lines.push('');
    return lines.join('\n');
  }

  turns.forEach((turn, index) => {
    lines.push(`### ${index + 1}. ${redactText(turn.kind || 'turn', { level })}: ${redactText(compact(turn.title || ''), { level })}`);
    if (turn.timestamp) lines.push(metadataLine('Timestamp', turn.timestamp, level));
    lines.push('');
    lines.push(fenced(redactText(turn.text || '', { level })));
    lines.push('');
  });

  return lines.join('\n');
}

function writeSessionExport(config) {
  const sessionExport = createSessionExport(config);
  const markdown = renderSessionMarkdown(sessionExport, { redactionLevel: config.redactionLevel });
  if (config.outFile) {
    fs.writeFileSync(config.outFile, markdown, 'utf8');
  } else {
    process.stdout.write(markdown);
  }
}

function singleProvider(providers = []) {
  const selected = providers.filter(Boolean);
  if (selected.length !== 1) throw new Error('export requires exactly one --provider value');
  return selected[0];
}

function metadataLine(label, value, level) {
  if (value == null || value === '') return null;
  return `${label}: ${redactText(value, { level })}`;
}

function fenced(value) {
  const text = String(value || '').trim();
  if (!text) return '_No text._';
  const maxTicks = Math.max(0, ...(text.match(/`+/g) || []).map((ticks) => ticks.length));
  const fence = '`'.repeat(Math.max(3, maxTicks + 1));
  return `${fence}\n${text}\n${fence}`;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

module.exports = {
  createSessionExport,
  renderSessionMarkdown,
  writeSessionExport,
};
