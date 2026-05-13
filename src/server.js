const http = require('node:http');
const path = require('node:path');

const { analyzeSession, listAnalysisTemplates } = require('./analysis');
const { createDefaultProviders, createRegistry } = require('./registry');
const { createRecap, renderRecapMarkdown } = require('./recap');
const { publicDir, readStaticFile } = require('./utils/files');
const { stripInternalSessionFields, stripSessionListFields } = require('./utils/security');

const DEFAULT_SESSION_LIMIT = 100;
const MAX_SESSION_LIMIT = 500;
const DEFAULT_TURN_LIMIT = 120;
const MAX_TURN_LIMIT = 1000;

function createServer(config) {
  const registry = createRegistry(createDefaultProviders(config));
  const staticRoot = config.publicDir || publicDir();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/api/providers') {
        return sendJSON(res, 200, { providers: registry.listProviders() });
      }

      if (url.pathname === '/api/sessions') {
        const providerFilter = url.searchParams.get('provider') || 'all';
        const { limit, offset } = parsePagination(url.searchParams);
        const total = registry.countSessions(providerFilter);
        const sessions = registry
          .listSessions(providerFilter, { limit: limit + offset })
          .slice(offset, offset + limit)
          .map(stripSessionListFields);
        return sendJSON(res, 200, {
          sessions,
          total,
          limit,
          offset,
          hasMore: offset + sessions.length < total,
        });
      }

      if (url.pathname === '/api/session') {
        const provider = url.searchParams.get('provider');
        const id = url.searchParams.get('id');
        if (!provider || !id) return sendJSON(res, 400, { error: 'provider and id are required' });
        const detail = registry.readSession(provider, id);
        if (!detail) return sendJSON(res, 404, { error: 'not found' });
        const turnsTotal = detail.turns.length;
        const turnLimit = parseBoundedInteger(
          url.searchParams.get('turnLimit'),
          DEFAULT_TURN_LIMIT,
          MAX_TURN_LIMIT,
        );
        return sendJSON(res, 200, {
          session: stripInternalSessionFields(detail.session),
          turns: latestItems(detail.turns, turnLimit),
          turnsTotal,
          turnLimit,
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
        const file = staticPath(staticRoot, url.pathname);
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

function latestItems(items, limit) {
  if (!Number.isInteger(limit) || limit <= 0 || items.length <= limit) return items;
  return items.slice(-limit);
}

function parseProviderFilter(value, fallback) {
  if (!value || value === 'all') return fallback;
  return String(value).split(',').map((provider) => provider.trim()).filter(Boolean);
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

function staticPath(staticRoot, pathname) {
  const name = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!['index.html', 'style.css', 'app.js'].includes(name)) return null;
  return path.join(staticRoot, name);
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(data));
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
