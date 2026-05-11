const PRICING = {
  'claude-opus-4-7': { in: 15, out: 75, cw5m: 18.75, cw1h: 30, cr: 1.5 },
  'claude-opus-4-6': { in: 15, out: 75, cw5m: 18.75, cw1h: 30, cr: 1.5 },
  'claude-opus-4-5': { in: 15, out: 75, cw5m: 18.75, cw1h: 30, cr: 1.5 },
  'claude-opus-4': { in: 15, out: 75, cw5m: 18.75, cw1h: 30, cr: 1.5 },
  'claude-sonnet-4-6': { in: 3, out: 15, cw5m: 3.75, cw1h: 6, cr: 0.3 },
  'claude-sonnet-4-5': { in: 3, out: 15, cw5m: 3.75, cw1h: 6, cr: 0.3 },
  'claude-sonnet-4': { in: 3, out: 15, cw5m: 3.75, cw1h: 6, cr: 0.3 },
  'claude-haiku-4-5': { in: 1, out: 5, cw5m: 1.25, cw1h: 2, cr: 0.1 },
};

const FALLBACK = { in: 3, out: 15, cw5m: 3.75, cw1h: 6, cr: 0.3 };

function priceFor(model) {
  if (!model) return FALLBACK;
  const exact = PRICING[model];
  if (exact) return exact;
  const base = String(model).replace(/-\d{8}$/, '').replace(/\[.*?\]$/, '');
  return PRICING[base] || FALLBACK;
}

function costFromUsage(model, usage) {
  if (!usage) return 0;
  const p = priceFor(model);
  const input = usage.input_tokens || 0;
  const output = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWriteTotal = usage.cache_creation_input_tokens || 0;
  const cacheWrite5m = usage.cache_creation?.ephemeral_5m_input_tokens || 0;
  const cacheWrite1h = usage.cache_creation?.ephemeral_1h_input_tokens || 0;
  const hasCacheBreakdown = cacheWrite5m || cacheWrite1h;
  const finalCacheWrite5m = hasCacheBreakdown ? cacheWrite5m : cacheWriteTotal;

  return (
    input * p.in +
    output * p.out +
    cacheRead * p.cr +
    finalCacheWrite5m * p.cw5m +
    cacheWrite1h * p.cw1h
  ) / 1_000_000;
}

function messageBlocksToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(blockToText).filter(Boolean).join('\n\n');
}

function blockToText(block) {
  if (typeof block === 'string') return block;
  if (!block || typeof block !== 'object') return '';
  if (block.type === 'text') return block.text || '';
  if (block.type === 'thinking') return `[thinking] ${block.thinking || ''}`;
  if (block.type === 'tool_use') {
    const input = block.input ? JSON.stringify(block.input) : '';
    return `[tool_use:${block.name || 'tool'}] ${input}`;
  }
  if (block.type === 'tool_result') {
    const content = block.content;
    if (typeof content === 'string') return `[tool_result] ${content}`;
    if (Array.isArray(content)) return `[tool_result] ${content.map(blockToText).filter(Boolean).join(' ')}`;
    return '[tool_result]';
  }
  if (block.type === 'image') return '[image]';
  return `[${block.type || 'block'}]`;
}

module.exports = {
  PRICING,
  blockToText,
  costFromUsage,
  messageBlocksToText,
  priceFor,
};
