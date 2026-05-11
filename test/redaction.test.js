const assert = require('node:assert/strict');
const test = require('node:test');

const { redactText } = require('../src/redaction');

test('redactText hides local paths and common secret shapes', () => {
  const npmToken = ['npm', '_', 'A'.repeat(36)].join('');
  const openAIToken = ['sk', '-', 'b'.repeat(32)].join('');
  const homePath = ['', 'Users', 'developer', 'Projects', 'demo-project'].join('/');
  const input = [
    `cwd=${homePath}`,
    `npm token ${npmToken}`,
    `Authorization: Bearer ${openAIToken}`,
    'Cookie: sessionid=abc123; user=demo',
    'API_SECRET=plain-secret-value',
  ].join('\n');

  const output = redactText(input);

  assert.match(output, /cwd=~\/Projects\/demo-project/);
  assert.doesNotMatch(output, /developer/);
  assert.doesNotMatch(output, new RegExp(npmToken));
  assert.doesNotMatch(output, new RegExp(openAIToken));
  assert.doesNotMatch(output, /sessionid=abc123/);
  assert.doesNotMatch(output, /plain-secret-value/);
  assert.match(output, /\[REDACTED_TOKEN\]/);
  assert.match(output, /Authorization: \[REDACTED_AUTH\]/);
  assert.match(output, /Cookie: \[REDACTED_COOKIE\]/);
  assert.match(output, /API_SECRET=\[REDACTED_SECRET\]/);
});
