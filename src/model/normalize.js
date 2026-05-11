function normalizeUsage(usage = {}) {
  return {
    inputTokens: usage.input_tokens || usage.inputTokens || 0,
    outputTokens: usage.output_tokens || usage.outputTokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || usage.cacheReadTokens || 0,
    cacheWriteTokens: usage.cache_creation_input_tokens || usage.cacheWriteTokens || 0,
  };
}

function emptySummary() {
  return {
    turns: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    costUSD: null,
  };
}

function addUsage(summary, usage, costUSD = null) {
  const normalized = normalizeUsage(usage);
  summary.turns += 1;
  summary.inputTokens += normalized.inputTokens;
  summary.outputTokens += normalized.outputTokens;
  summary.cacheReadTokens += normalized.cacheReadTokens;
  summary.cacheWriteTokens += normalized.cacheWriteTokens;
  if (costUSD != null) summary.costUSD = (summary.costUSD || 0) + costUSD;
  return summary;
}

module.exports = {
  addUsage,
  emptySummary,
  normalizeUsage,
};
