const fs = require('node:fs');
const path = require('node:path');

function publicDir() {
  return path.join(__dirname, '..', '..', 'public');
}

function webDistDir() {
  return path.join(__dirname, '..', '..', 'web', 'dist');
}

function readStaticFile(file) {
  try {
    const body = fs.readFileSync(file);
    return {
      body,
      contentType: contentTypeFor(file),
    };
  } catch {
    return null;
  }
}

function contentTypeFor(file) {
  const ext = path.extname(file);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.json') return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

module.exports = {
  contentTypeFor,
  publicDir,
  readStaticFile,
  webDistDir,
};
