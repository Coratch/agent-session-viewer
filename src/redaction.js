function redactText(value, options = {}) {
  if (value == null) return '';
  const level = typeof options === 'string' ? options : options.level || 'basic';
  const text = String(value);
  if (level === 'none') return text;

  const basic = text
    .replace(/\/Users\/[^/\s"'`]+/g, '~')
    .replace(/\b(?:npm|ghp|github_pat)_[A-Za-z0-9_]{16,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_TOKEN]')
    .replace(/^(authorization\s*[:=]\s*).+$/gim, '$1[REDACTED_AUTH]')
    .replace(/^(cookie\s*[:=]\s*).+$/gim, '$1[REDACTED_COOKIE]')
    .replace(/^([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=\s*).+$/gim, '$1[REDACTED_SECRET]');

  if (level !== 'strict') return basic;

  return basic
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]')
    .replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_TOKEN]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[REDACTED_TOKEN]')
    .replace(/^(\s*(?:user|username|owner)\s*[:=]\s*)[^\s#]+/gim, '$1[REDACTED_USER]')
    .replace(/(\b--(?:user|username)\s+)[^\s]+/gi, '$1[REDACTED_USER]')
    .replace(/(?<![:\w])\/(?:Users|home|workspace|private|tmp|var|etc|opt|usr|Volumes|app)(?:\/[^\s"'`),;:]+)+/g, '[REDACTED_PATH]');
}

module.exports = {
  redactText,
};
