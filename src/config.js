const os = require('node:os');
const path = require('node:path');

const DEFAULT_PROVIDERS = ['claude-code', 'codex'];
const EXAMPLES_DIR = path.join(__dirname, '..', 'examples', 'fixtures');

function parseArgs(argv) {
  const cfg = {
    host: process.env.HOST || '127.0.0.1',
    port: parsePort(process.env.PORT, 4500),
    providers: parseProviders(process.env.PROVIDER || process.env.PROVIDERS),
    claudeDir: process.env.CLAUDE_PROJECTS_DIR ||
      process.env.CC_PROJECTS_DIR ||
      path.join(os.homedir(), '.claude', 'projects'),
    codexDir: process.env.CODEX_SESSIONS_DIR ||
      path.join(os.homedir(), '.codex', 'sessions'),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port' || arg === '-p') {
      cfg.port = parsePort(argv[++i], cfg.port);
    } else if (arg === '--host') {
      cfg.host = requireValue(arg, argv[++i]);
    } else if (arg === '--provider' || arg === '--providers') {
      cfg.providers = parseProviders(requireValue(arg, argv[++i]));
    } else if (arg === '--claude-dir') {
      cfg.claudeDir = requireValue(arg, argv[++i]);
    } else if (arg === '--codex-dir') {
      cfg.codexDir = requireValue(arg, argv[++i]);
    } else if (arg === '--demo' || arg === 'demo') {
      enableDemo(cfg);
    } else if (/^\d+$/.test(arg)) {
      cfg.port = parsePort(arg, cfg.port);
    } else if (arg === '--help' || arg === '-h') {
      cfg.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return cfg;
}

function enableDemo(cfg) {
  cfg.demo = true;
  cfg.providers = [...DEFAULT_PROVIDERS];
  cfg.claudeDir = path.join(EXAMPLES_DIR, 'claude', 'projects');
  cfg.codexDir = path.join(EXAMPLES_DIR, 'codex', 'sessions');
}

function parseProviders(value) {
  if (!value) return [...DEFAULT_PROVIDERS];
  const providers = String(value)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return providers.length ? providers : [...DEFAULT_PROVIDERS];
}

function parsePort(value, fallback) {
  if (value == null || value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function requireValue(flag, value) {
  if (value == null || value === '') throw new Error(`${flag} requires a value`);
  return value;
}

module.exports = {
  DEFAULT_PROVIDERS,
  parseArgs,
};
