const { buildEvidencePack } = require('./evidence');
const { createClaudePAdapter } = require('./llm');
const { assemblePrompt, getAnalysisTemplate, listAnalysisTemplates } = require('./prompts');
const { validateAnalysisResult, validateEvidenceRefs } = require('./schema');

async function analyzeSession(detail, options = {}) {
  const templateId = options.templateId || 'time-diagnosis';
  const llmId = options.llmId || 'claude-p';
  const redactionLevel = options.redactionLevel || 'strict';
  const evidencePack = buildEvidencePack(detail, {
    redactionLevel,
    idleGapMs: options.idleGapMs,
    previewLimit: options.previewLimit,
  });
  const template = getAnalysisTemplate(templateId);
  const prompt = assemblePrompt({
    templateId,
    evidencePack,
    customPrompt: options.customPrompt,
  });
  const adapter = options.adapter || createClaudePAdapter(options.claude || {});
  try {
    const modelResult = await adapter.run({ prompt, schema: template.schema });
    const validation = validateAnalysisResult(modelResult);
    if (!validation.valid) throw new Error(`Invalid analysis result: ${validation.errors.join('; ')}`);
    const result = mergeTrustedDuration(modelResult, evidencePack.trustedMetrics);
    const invalidEvidenceRefs = validateEvidenceRefs(
      result,
      new Set(evidencePack.turns.map((turn) => turn.id)),
    );
    return {
      templateId,
      llmId,
      redactionLevel,
      result,
      evidencePack,
      localChecks: {
        invalidEvidenceRefs,
        schemaValid: true,
        fallbackUsed: false,
      },
    };
  } catch (err) {
    return fallbackAnalysis({
      templateId,
      llmId,
      redactionLevel,
      evidencePack,
      error: err,
    });
  }
}

function mergeTrustedDuration(result, metrics) {
  return {
    ...result,
    duration: {
      ...(result.duration || {}),
      totalMs: metrics.totalDurationMs,
      activeMs: metrics.activeDurationMs,
      idleMs: metrics.idleDurationMs,
    },
  };
}

function fallbackAnalysis({ templateId, llmId, redactionLevel, evidencePack, error }) {
  const metrics = evidencePack.trustedMetrics;
  return {
    templateId,
    llmId,
    redactionLevel,
    result: {
      summary: 'Local fallback analysis used because LLM analysis failed.',
      duration: {
        totalMs: metrics.totalDurationMs,
        activeMs: metrics.activeDurationMs,
        idleMs: metrics.idleDurationMs,
      },
      topDelaySegments: metrics.largestGaps.map((gap) => ({
        category: gap.category === 'tool_execution' ? 'tool_execution' : gap.idle ? 'user_idle' : 'unknown',
        durationMs: gap.durationMs,
        evidenceTurnIds: [gap.fromTurnId, gap.toTurnId].filter(Boolean),
        confidence: gap.category === 'tool_execution' || gap.idle ? 'medium' : 'low',
        explanation: gap.idle
          ? 'Large gap detected from timestamps; exact cause needs LLM analysis.'
          : 'Gap detected from timestamps; exact cause is unknown.',
      })),
      rootCauses: [],
      unknowns: ['LLM analysis unavailable; only local timestamp metrics are shown.'],
      confidence: 'low',
    },
    evidencePack,
    error: {
      message: error.message || String(error),
    },
    localChecks: {
      invalidEvidenceRefs: [],
      schemaValid: false,
      fallbackUsed: true,
    },
  };
}

module.exports = {
  analyzeSession,
  listAnalysisTemplates,
};
