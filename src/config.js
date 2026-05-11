const os = require('node:os');
const path = require('node:path');

const DEFAULT_PROVIDERS = ['claude-code', 'codex'];
const EXAMPLES_DIR = path.join(__dirname, '..', 'examples', 'fixtures');

function parseArgs(argv) {
  const cfg = {
    command: 'serve',
    host: process.env.HOST || '127.0.0.1',
    port: parsePort(process.env.PORT, 4500),
    providers: parseProviders(process.env.PROVIDER || process.env.PROVIDERS),
    claudeDir: process.env.CLAUDE_PROJECTS_DIR ||
      process.env.CC_PROJECTS_DIR ||
      path.join(os.homedir(), '.claude', 'projects'),
    codexDir: process.env.CODEX_SESSIONS_DIR ||
      path.join(os.homedir(), '.codex', 'sessions'),
  };

  if (argv[0] === 'recap') {
    cfg.command = 'recap';
    cfg.days = 7;
    cfg.format = 'markdown';
    cfg.redact = true;
    parseRecapArgs(cfg, argv.slice(1));
    return cfg;
  }

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

function parseRecapArgs(cfg, argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--days') {
      cfg.days = parsePositiveInteger(requireValue(arg, argv[++i]), arg);
      cfg.daysExplicit = true;
    } else if (arg === '--since') {
      cfg.since = requireValue(arg, argv[++i]);
    } else if (arg === '--project') {
      cfg.project = requireValue(arg, argv[++i]);
    } else if (arg === '--format') {
      cfg.format = parseFormat(requireValue(arg, argv[++i]));
    } else if (arg === '--out' || arg === '-o') {
      cfg.outFile = requireValue(arg, argv[++i]);
    } else if (arg === '--provider' || arg === '--providers') {
      cfg.providers = parseProviders(requireValue(arg, argv[++i]));
    } else if (arg === '--claude-dir') {
      cfg.claudeDir = requireValue(arg, argv[++i]);
    } else if (arg === '--codex-dir') {
      cfg.codexDir = requireValue(arg, argv[++i]);
    } else if (arg === '--demo') {
      enableDemo(cfg);
    } else if (arg === '--help' || arg === '-h') {
      cfg.help = true;
    } else {
      throw new Error(`Unknown recap argument: ${arg}`);
    }
  }
}

function enableDemo(cfg) {
  cfg.demo = true;
  cfg.providers = [...DEFAULT_PROVIDERS];
  cfg.claudeDir = path.join(EXAMPLES_DIR, 'claude', 'projects');
  cfg.codexDir = path.join(EXAMPLES_DIR, 'codex', 'sessions');
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} requires a positive integer`);
  }
  return parsed;
}

function parseFormat(value) {
  if (value !== 'markdown') throw new Error(`Unsupported format: ${value}`);
  return value;
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
