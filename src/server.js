const http = require('node:http');
const path = require('node:path');

const { createDefaultProviders, createRegistry } = require('./registry');
const { createRecap, renderRecapMarkdown } = require('./recap');
const { publicDir, readStaticFile } = require('./utils/files');
const { stripInternalSessionFields } = require('./utils/security');

function createServer(config) {
  const registry = createRegistry(createDefaultProviders(config));
  const staticRoot = config.publicDir || publicDir();

  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/api/providers') {
      return sendJSON(res, 200, { providers: registry.listProviders() });
    }

    if (url.pathname === '/api/sessions') {
      const providerFilter = url.searchParams.get('provider') || 'all';
      const sessions = registry
        .listSessions(providerFilter)
        .map(stripInternalSessionFields);
      return sendJSON(res, 200, { sessions });
    }

    if (url.pathname === '/api/session') {
      const provider = url.searchParams.get('provider');
      const id = url.searchParams.get('id');
      if (!provider || !id) return sendJSON(res, 400, { error: 'provider and id are required' });
      const detail = registry.readSession(provider, id);
      if (!detail) return sendJSON(res, 404, { error: 'not found' });
      return sendJSON(res, 200, {
        session: stripInternalSessionFields(detail.session),
        turns: detail.turns,
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

    if (req.method === 'GET') {
      const file = staticPath(staticRoot, url.pathname);
      if (file) return serveStatic(res, file);
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  });
}

function parseDays(value, fallback) {
  if (!value) return fallback;
  const days = Number(value);
  return Number.isInteger(days) && days > 0 ? days : fallback;
}

function parseProviderFilter(value, fallback) {
  if (!value || value === 'all') return fallback;
  return String(value).split(',').map((provider) => provider.trim()).filter(Boolean);
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
