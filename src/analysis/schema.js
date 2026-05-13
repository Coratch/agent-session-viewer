const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);
const VALID_DELAY_CATEGORIES = new Set([
  'tool_execution',
  'command_wait',
  'retry_loop',
  'permission_wait',
  'user_idle',
  'context_overload',
  'network_or_install',
  'test_or_build',
  'unknown',
]);

function validateAnalysisResult(result) {
  const errors = [];
  if (!isObject(result)) return { valid: false, errors: ['result must be an object'] };
  requireString(result, 'summary', errors);
  requireObject(result, 'duration', errors);
  if (isObject(result.duration)) {
    requireNumber(result.duration, 'totalMs', errors);
    requireNumber(result.duration, 'activeMs', errors);
    requireNumber(result.duration, 'idleMs', errors);
  }
  requireArray(result, 'topDelaySegments', errors);
  for (const [index, segment] of arrayValue(result.topDelaySegments).entries()) {
    validateDelaySegment(segment, `topDelaySegments[${index}]`, errors);
  }
  requireArray(result, 'rootCauses', errors);
  for (const [index, cause] of arrayValue(result.rootCauses).entries()) {
    validateRootCause(cause, `rootCauses[${index}]`, errors);
  }
  requireArray(result, 'unknowns', errors);
  if (Array.isArray(result.unknowns)) {
    result.unknowns.forEach((unknown, index) => {
      if (typeof unknown !== 'string') errors.push(`unknowns[${index}] must be a string`);
    });
  }
  requireEnum(result, 'confidence', VALID_CONFIDENCE, errors);
  return { valid: errors.length === 0, errors };
}

function validateEvidenceRefs(result, turnIds) {
  const invalid = new Set();
  for (const id of collectEvidenceRefs(result)) {
    if (!turnIds.has(id)) invalid.add(id);
  }
  return [...invalid];
}

function collectEvidenceRefs(result) {
  const refs = [];
  for (const segment of arrayValue(result?.topDelaySegments)) {
    refs.push(...arrayValue(segment?.evidenceTurnIds));
  }
  for (const cause of arrayValue(result?.rootCauses)) {
    refs.push(...arrayValue(cause?.evidenceTurnIds));
  }
  return refs.filter((ref) => typeof ref === 'string' && ref);
}

function validateDelaySegment(segment, path, errors) {
  if (!isObject(segment)) {
    errors.push(`${path} must be an object`);
    return;
  }
  requireEnum(segment, 'category', VALID_DELAY_CATEGORIES, errors, `${path}.category`);
  requireNumber(segment, 'durationMs', errors, `${path}.durationMs`);
  requireEvidenceRefs(segment, 'evidenceTurnIds', errors, `${path}.evidenceTurnIds`);
  requireEnum(segment, 'confidence', VALID_CONFIDENCE, errors, `${path}.confidence`);
  requireString(segment, 'explanation', errors, `${path}.explanation`);
}

function validateRootCause(cause, path, errors) {
  if (!isObject(cause)) {
    errors.push(`${path} must be an object`);
    return;
  }
  requireString(cause, 'cause', errors, `${path}.cause`);
  requireEvidenceRefs(cause, 'evidenceTurnIds', errors, `${path}.evidenceTurnIds`);
  requireString(cause, 'recommendation', errors, `${path}.recommendation`);
}

function requireEvidenceRefs(object, key, errors, path = key) {
  requireArray(object, key, errors, path);
  for (const [index, value] of arrayValue(object[key]).entries()) {
    if (typeof value !== 'string' || !value) errors.push(`${path}[${index}] must be a non-empty string`);
  }
}

function requireString(object, key, errors, path = key) {
  if (typeof object[key] !== 'string') errors.push(`${path} must be a string`);
}

function requireNumber(object, key, errors, path = key) {
  if (typeof object[key] !== 'number' || !Number.isFinite(object[key])) errors.push(`${path} must be a number`);
}

function requireObject(object, key, errors, path = key) {
  if (!isObject(object[key])) errors.push(`${path} must be an object`);
}

function requireArray(object, key, errors, path = key) {
  if (!Array.isArray(object[key])) errors.push(`${path} must be an array`);
}

function requireEnum(object, key, values, errors, path = key) {
  if (!values.has(object[key])) errors.push(`${path} must be one of ${[...values].join(', ')}`);
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

module.exports = {
  collectEvidenceRefs,
  validateAnalysisResult,
  validateEvidenceRefs,
};
