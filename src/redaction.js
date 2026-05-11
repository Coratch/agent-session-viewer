function redactText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\/Users\/[^/\s"'`]+/g, '~')
    .replace(/\b(?:npm|ghp|github_pat)_[A-Za-z0-9_]{16,}\b/g, '[REDACTED_TOKEN]')
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[REDACTED_TOKEN]')
    .replace(/^(authorization\s*[:=]\s*).+$/gim, '$1[REDACTED_AUTH]')
    .replace(/^(cookie\s*[:=]\s*).+$/gim, '$1[REDACTED_COOKIE]')
    .replace(/^([A-Z0-9_]*(?:SECRET|TOKEN|KEY|PASSWORD)[A-Z0-9_]*\s*=\s*).+$/gim, '$1[REDACTED_SECRET]');
}

module.exports = {
  redactText,
};
