const { createClaudeCodeProvider } = require('./providers/claude-code');
const { createCodexProvider } = require('./providers/codex');

function createDefaultProviders(config) {
  const selected = new Set(config.providers || ['claude-code', 'codex']);
  const providers = [];
  if (selected.has('claude-code')) {
    providers.push(createClaudeCodeProvider({ rootDir: config.claudeDir }));
  }
  if (selected.has('codex')) {
    providers.push(createCodexProvider({ rootDir: config.codexDir }));
  }
  return providers;
}

function createRegistry(providers) {
  const byId = new Map(providers.map((provider) => [provider.id, provider]));
  return {
    providers,
    listProviders() {
      return providers.map((provider) => ({
        id: provider.id,
        label: provider.label,
        rootDir: provider.rootDir,
      }));
    },
    countSessions(providerFilter = 'all') {
      return selectedProviders(providers, providerFilter)
        .reduce((total, provider) => {
          if (typeof provider.countSessions === 'function') return total + provider.countSessions();
          return total + provider.listSessions().length;
        }, 0);
    },
    listSessions(providerFilter = 'all', options = {}) {
      const providerLimit = Number.isInteger(options.limit) && options.limit > 0
        ? options.limit
        : undefined;
      return selectedProviders(providers, providerFilter)
        .flatMap((provider) => provider.listSessions({ limit: providerLimit }))
        .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    },
    readSession(providerId, sessionId) {
      const provider = byId.get(providerId);
      if (!provider) return null;
      try {
        return provider.readSession(sessionId);
      } catch (err) {
        if (/Unknown session/.test(err.message)) return null;
        throw err;
      }
    },
  };
}

function selectedProviders(providers, providerFilter) {
  if (!providerFilter || providerFilter === 'all') return providers;
  const wanted = new Set(String(providerFilter).split(',').map((p) => p.trim()).filter(Boolean));
  return providers.filter((provider) => wanted.has(provider.id));
}

module.exports = {
  createDefaultProviders,
  createRegistry,
};
