function stripInternalSessionFields(session) {
  const { file, meta, ...safe } = session;
  return {
    ...safe,
    meta: sanitizeSessionMeta(meta),
  };
}

function stripSessionListFields(session) {
  const { file, meta, ...safe } = session;
  return safe;
}

function sanitizeSessionMeta(meta = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(meta || {})) {
    if (value == null) continue;
    if (!['string', 'number', 'boolean'].includes(typeof value)) continue;
    const text = String(value);
    safe[key] = text.length > 240 ? text.slice(0, 237) + '...' : value;
  }
  return safe;
}

module.exports = {
  sanitizeSessionMeta,
  stripInternalSessionFields,
  stripSessionListFields,
};
