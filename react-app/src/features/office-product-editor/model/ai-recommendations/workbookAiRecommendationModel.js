import { toTrimmedString } from '../../../../common/utils/text';
import { toUniqueStrings } from '../../../../common/utils/array';

const ALLOWED_SEVERITIES = new Set(['high', 'medium', 'low']);

function buildRecommendationId(input) {
  const relatedRowIds = toUniqueStrings(input.relatedRowIds);
  const title = toTrimmedString(input.title);

  return input.id ?? `${title || 'recommendation'}:${relatedRowIds.join(',')}`;
}

function normalizeSeverity(severity) {
  const normalizedSeverity = toTrimmedString(severity).toLowerCase();

  return ALLOWED_SEVERITIES.has(normalizedSeverity) ? normalizedSeverity : 'medium';
}

export function createAiRecommendation(input) {
  return {
    id: buildRecommendationId(input),
    severity: normalizeSeverity(input.severity),
    title: toTrimmedString(input.title),
    reason: toTrimmedString(input.reason),
    relatedRowIds: toUniqueStrings(input.relatedRowIds),
  };
}
