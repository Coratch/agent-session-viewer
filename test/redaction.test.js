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

test('redactText strict mode hides broader share-risk identifiers', () => {
  const awsKey = `AKIA${'A'.repeat(16)}`;
  const googleKey = `AIza${'B'.repeat(35)}`;
  const input = [
    'owner=alice',
    'email alice@example.com',
    'host 192.168.12.34',
    'path /workspace/private-repo/src/index.js',
    `aws ${awsKey}`,
    `google ${googleKey}`,
  ].join('\n');

  const output = redactText(input, { level: 'strict' });

  assert.doesNotMatch(output, /alice/);
  assert.doesNotMatch(output, /alice@example\.com/);
  assert.doesNotMatch(output, /192\.168\.12\.34/);
  assert.doesNotMatch(output, /\/workspace\/private-repo/);
  assert.doesNotMatch(output, new RegExp(awsKey));
  assert.doesNotMatch(output, new RegExp(googleKey));
  assert.match(output, /owner=\[REDACTED_USER\]/);
  assert.match(output, /\[REDACTED_EMAIL\]/);
  assert.match(output, /\[REDACTED_IP\]/);
  assert.match(output, /\[REDACTED_PATH\]/);
  assert.match(output, /\[REDACTED_TOKEN\]/);
});

test('redactText none mode leaves text unchanged', () => {
  const token = ['sk', '-', 'demo-token-value-1234567890'].join('');
  const input = `Authorization: Bearer ${token}`;

  assert.equal(redactText(input, { level: 'none' }), input);
});
