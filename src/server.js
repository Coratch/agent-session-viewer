const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { analyzeSession, listAnalysisTemplates } = require('./analysis');
const { renderSessionMarkdown } = require('./exporter');
const { createDefaultProviders, createRegistry } = require('./registry');
const { createRecap, renderRecapMarkdown } = require('./recap');
const { publicDir, readStaticFile, webDistDir } = require('./utils/files');
const { stripInternalSessionFields, stripSessionListFields } = require('./utils/security');

const DEFAULT_SESSION_LIMIT = 100;
const MAX_SESSION_LIMIT = 500;
const DEFAULT_TURN_LIMIT = 200;
const MAX_TURN_LIMIT = 1000;

function createServer(config) {
  const registry = createRegistry(createDefaultProviders(config));
  const staticFiles = resolveStaticFiles(config);

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/api/providers') {
        return sendJSON(res, 200, { providers: registry.listProviders() });
      }

      if (url.pathname === '/api/sessions') {
        const providerFilter = url.searchParams.get('provider') || 'all';
        const query = normalizeSessionQuery(url.searchParams.get('q'));
        const { limit, offset } = parsePagination(url.searchParams);
        const allSessions = query
          ? registry.listSessions(providerFilter).filter((session) => sessionMatchesQuery(session, query))
          : registry.listSessions(providerFilter, { limit: limit + offset });
        const total = query ? allSessions.length : registry.countSessions(providerFilter);
        const sessions = allSessions
          .slice(offset, offset + limit)
          .map(stripSessionListFields);
        return sendJSON(res, 200, {
          sessions,
          total,
          limit,
          offset,
          hasMore: offset + sessions.length < total,
          query,
        });
      }

      if (url.pathname === '/api/session/turns') {
        const result = readRequiredSession(registry, url.searchParams);
        if (result.error) return sendJSON(res, result.status, { error: result.error });
        const page = turnWindow(result.detail.turns, {
          limit: parseBoundedInteger(url.searchParams.get('limit'), DEFAULT_TURN_LIMIT, MAX_TURN_LIMIT),
          anchor: url.searchParams.get('anchor'),
          beforeOrdinal: url.searchParams.get('beforeOrdinal'),
          afterOrdinal: url.searchParams.get('afterOrdinal'),
          centerTurnId: url.searchParams.get('centerTurnId') || url.searchParams.get('turnId'),
          centerOrdinal: url.searchParams.get('centerOrdinal'),
          before: url.searchParams.get('before'),
          after: url.searchParams.get('after'),
        });
        return sendJSON(res, 200, page);
      }

      if (url.pathname === '/api/session/search') {
        const result = readRequiredSession(registry, url.searchParams);
        if (result.error) return sendJSON(res, result.status, { error: result.error });
        return sendJSON(res, 200, searchTurns(result.detail.turns, {
          query: url.searchParams.get('q'),
          limit: parseBoundedInteger(url.searchParams.get('limit'), 50, 100),
          cursor: url.searchParams.get('cursor'),
        }));
      }

      if (url.pathname === '/api/session/export') {
        const result = readRequiredSession(registry, url.searchParams);
        if (result.error) return sendJSON(res, result.status, { error: result.error });
        const redactionLevel = parseExportRedactionLevel(url.searchParams.get('redaction'));
        const markdown = renderSessionMarkdown({
          generatedAt: new Date().toISOString(),
          redactionLevel,
          session: result.detail.session,
          turns: result.detail.turns || [],
        }, { redactionLevel });
        return sendMarkdown(res, 200, markdown, sessionExportFilename(result.detail.session));
      }

      if (url.pathname === '/api/session') {
        const result = readRequiredSession(registry, url.searchParams);
        if (result.error) return sendJSON(res, result.status, { error: result.error });
        const detail = result.detail;
        const turnsTotal = detail.turns.length;
        const turnLimit = parseBoundedInteger(
          url.searchParams.get('turnLimit'),
          DEFAULT_TURN_LIMIT,
          MAX_TURN_LIMIT,
        );
        const page = turnWindow(detail.turns, {
          limit: turnLimit,
          beforeOrdinal: url.searchParams.get('beforeTurn'),
          centerTurnId: url.searchParams.get('turnId'),
        });
        return sendJSON(res, 200, {
          session: stripInternalSessionFields(detail.session),
          turns: page.turns,
          turnsTotal,
          turnLimit,
          loadedRange: page.loadedRange,
          hasOlderTurns: page.hasOlder,
          olderCursor: page.hasOlder ? page.loadedRange.start : null,
          hasNewerTurns: page.hasNewer,
          newerCursor: page.hasNewer ? page.loadedRange.end : null,
          targetTurnFound: page.target.found,
          target: page.target,
        });
      }

      if (url.pathname === '/api/recap') {
        const recapConfig = {
          ...config,
          command: 'recap',
          days: parseDays(url.searchParams.get('days'), 7),
          since: url.searchParams.get('since') || undefined,
          project: url.searchParams.get('project') || undefined,
          providers: parseProviderFilter(url.searchParams.get('provider'), config.providers),
          format: 'markdown',
          redact: true,
        };
        const recap = createRecap(recapConfig);
        return sendJSON(res, 200, {
          recap,
          markdown: renderRecapMarkdown(recap),
        });
      }

      if (url.pathname === '/api/analysis/templates') {
        return sendJSON(res, 200, {
          templates: listAnalysisTemplates(),
          llms: [
            {
              id: 'claude-p',
              label: 'Claude Code CLI',
              enabled: true,
            },
          ],
        });
      }

      if (url.pathname === '/api/session/analyze' && req.method === 'POST') {
        const body = await readJSONBody(req);
        if (!body.provider || !body.id) {
          return sendJSON(res, 400, { error: 'provider and id are required' });
        }
        const detail = registry.readSession(body.provider, body.id);
        if (!detail) return sendJSON(res, 404, { error: 'not found' });
        const analysis = await analyzeSession(detail, {
          adapter: config.analysisAdapter,
          llmId: body.llmId || config.analysisAdapter?.id || 'claude-p',
          templateId: body.templateId || 'time-diagnosis',
          customPrompt: body.customPrompt || '',
        });
        return sendJSON(res, 200, analysis);
      }

      if (req.method === 'GET') {
        const file = staticPath(staticFiles, url.pathname);
        if (file) return serveStatic(res, file);
      }

      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
    } catch (err) {
      sendJSON(res, 500, { error: err.message || String(err) });
    }
  });
}

function parseDays(value, fallback) {
  if (!value) return fallback;
  const days = Number(value);
  return Number.isInteger(days) && days > 0 ? days : fallback;
}

function parsePagination(searchParams) {
  return {
    limit: parseBoundedInteger(searchParams.get('limit'), DEFAULT_SESSION_LIMIT, MAX_SESSION_LIMIT),
    offset: parseNonNegativeInteger(searchParams.get('offset'), 0),
  };
}

function readRequiredSession(registry, searchParams) {
  const provider = searchParams.get('provider');
  const id = searchParams.get('id');
  if (!provider || !id) return { status: 400, error: 'provider and id are required' };
  const detail = registry.readSession(provider, id);
  if (!detail) return { status: 404, error: 'not found' };
  return { detail };
}

function normalizeSessionQuery(value) {
  return String(value || '').trim().toLowerCase();
}

function sessionMatchesQuery(session, query) {
  if (!query) return true;
  const summary = session.summary || {};
  return [
    session.provider,
    session.project,
    session.id,
    session.title,
    session.model,
    session.cwd,
    session.status,
    summary.turns,
    summary.inputTokens,
    summary.outputTokens,
  ].some((value) => String(value || '').toLowerCase().includes(query));
}

function parseBoundedInteger(value, fallback, max) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function parseNonNegativeInteger(value, fallback) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
}

function parseTurnCursor(value, fallback, max) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function turnWindow(turns, options = {}) {
  const items = Array.isArray(turns) ? turns : [];
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? Math.min(options.limit, MAX_TURN_LIMIT)
    : DEFAULT_TURN_LIMIT;
  const total = items.length;
  let start = null;
  let end = total;
  let target = { turnId: null, ordinal: null, found: null };

  if (options.centerTurnId || options.centerOrdinal != null) {
    const targetIndex = options.centerTurnId
      ? items.findIndex((turn) => turn.id === options.centerTurnId)
      : parseNonNegativeInteger(options.centerOrdinal, -1);
    if (targetIndex < 0 || targetIndex >= total) {
      const missingTurnId = options.centerTurnId || null;
      return emptyTurnWindow(items.length, { turnId: missingTurnId, ordinal: null, found: false });
    }
    const before = Math.min(parseNonNegativeInteger(options.before, Math.floor((limit - 1) / 2)), MAX_TURN_LIMIT - 1);
    const afterFallback = Math.max(0, limit - before - 1);
    const after = Math.min(parseNonNegativeInteger(options.after, afterFallback), MAX_TURN_LIMIT - before - 1);
    start = Math.max(0, targetIndex - before);
    end = Math.min(total, targetIndex + after + 1);
    target = { turnId: items[targetIndex].id || options.centerTurnId || null, ordinal: targetIndex, found: true };
  } else if (options.afterOrdinal != null && options.afterOrdinal !== '') {
    start = Math.min(total, parseNonNegativeInteger(options.afterOrdinal, -1) + 1);
    end = Math.min(total, start + limit);
  } else {
    end = parseTurnCursor(options.beforeOrdinal, total, total);
  }

  if (start == null) start = Math.max(0, end - limit);
  return {
    turns: withOrdinals(items, start, end),
    loadedRange: { start, end },
    turnsTotal: total,
    hasOlder: start > 0,
    hasNewer: end < total,
    target,
  };
}

function emptyTurnWindow(total, target) {
  return {
    turns: [],
    loadedRange: { start: 0, end: 0 },
    turnsTotal: total,
    hasOlder: false,
    hasNewer: total > 0,
    target,
  };
}

function withOrdinals(items, start, end) {
  return items.slice(start, end).map((turn, index) => ({
    ...turn,
    ordinal: start + index,
  }));
}

function searchTurns(turns, options = {}) {
  const items = Array.isArray(turns) ? turns : [];
  const query = normalizeSessionQuery(options.query);
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? Math.min(options.limit, 100)
    : 50;
  const cursor = parseNonNegativeInteger(options.cursor, 0);
  const hits = [];
  let nextCursor = null;

  if (!query) {
    return { query, hits, nextCursor };
  }

  for (let ordinal = cursor; ordinal < items.length; ordinal += 1) {
    const turn = items[ordinal] || {};
    const searchable = turnSearchText(turn);
    if (!searchable.toLowerCase().includes(query)) continue;
    hits.push({
      turnId: turn.id || '',
      ordinal,
      kind: turn.kind || '',
      timestamp: turn.timestamp || '',
      title: turn.title || '',
      snippet: searchSnippet(searchable, query),
    });
    if (hits.length >= limit) {
      nextCursor = ordinal + 1 < items.length ? String(ordinal + 1) : null;
      break;
    }
  }

  return { query, hits, nextCursor };
}

function turnSearchText(turn) {
  return [turn.kind, turn.title, turn.text]
    .filter((value) => value != null && value !== '')
    .map((value) => String(value))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchSnippet(text, query) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const matchIndex = normalized.toLowerCase().indexOf(query);
  if (matchIndex < 0) return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(normalized.length, matchIndex + query.length + 90);
  return `${start > 0 ? '...' : ''}${normalized.slice(start, end)}${end < normalized.length ? '...' : ''}`;
}

function parseProviderFilter(value, fallback) {
  if (!value || value === 'all') return fallback;
  return String(value).split(',').map((provider) => provider.trim()).filter(Boolean);
}

function parseExportRedactionLevel(value) {
  if (!value) return 'strict';
  return ['basic', 'strict', 'none'].includes(value) ? value : 'strict';
}

function sessionExportFilename(session = {}) {
  const name = `${session.provider || 'session'}-${session.id || 'export'}`
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'runwhy-session';
  return `${name}.md`;
}

function readJSONBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('error', reject);
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
  });
}

function resolveStaticFiles(config = {}) {
  if (config.ui !== 'classic') {
    const root = config.webDistDir || webDistDir();
    if (hasStaticIndex(root)) return { root, mode: 'react' };
  }
  return { root: config.publicDir || publicDir(), mode: 'classic' };
}

function hasStaticIndex(root) {
  try {
    return fs.statSync(path.join(root, 'index.html')).isFile();
  } catch {
    return false;
  }
}

function staticPath(staticFiles, pathname) {
  const name = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (staticFiles.mode === 'classic' && !['index.html', 'style.css', 'app.js'].includes(name)) return null;
  const root = path.resolve(staticFiles.root);
  const file = path.resolve(root, name);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function sendMarkdown(res, status, markdown, filename) {
  res.writeHead(status, {
    'content-type': 'text/markdown; charset=utf-8',
    'content-disposition': `attachment; filename="${filename}"`,
    'cache-control': 'no-store',
  });
  res.end(markdown);
}

function serveStatic(res, file) {
  const asset = readStaticFile(file);
  if (!asset) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': asset.contentType,
    'cache-control': 'no-store',
  });
  res.end(asset.body);
}

module.exports = {
  createServer,
};
