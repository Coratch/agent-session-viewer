const assert = require('node:assert/strict');
const test = require('node:test');

const { costFromUsage, messageBlocksToText } = require('../src/model/pricing');

test('costFromUsage prices sonnet usage with cache buckets', () => {
  const cost = costFromUsage('claude-sonnet-4-5-20251001', {
    input_tokens: 1000,
    output_tokens: 2000,
    cache_read_input_tokens: 3000,
    cache_creation_input_tokens: 7000,
    cache_creation: {
      ephemeral_5m_input_tokens: 4000,
      ephemeral_1h_input_tokens: 3000,
    },
  });

  assert.equal(cost, 0.0669);
});

test('messageBlocksToText renders text, thinking, tool use, and tool result blocks', () => {
  const text = messageBlocksToText([
    { type: 'text', text: 'hello' },
    { type: 'thinking', thinking: 'short summary' },
    { type: 'tool_use', name: 'Read', input: { file_path: '/tmp/a.txt' } },
    { type: 'tool_result', content: [{ type: 'text', text: 'ok' }] },
  ]);

  assert.match(text, /hello/);
  assert.match(text, /\[thinking\] short summary/);
  assert.match(text, /\[tool_use:Read\]/);
  assert.match(text, /\[tool_result\] ok/);
});
