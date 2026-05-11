const http = require('node:http');
const path = require('node:path');

const { createDefaultProviders, createRegistry } = require('./registry');
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

    if (req.method === 'GET') {
      const file = staticPath(staticRoot, url.pathname);
      if (file) return serveStatic(res, file);
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
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
