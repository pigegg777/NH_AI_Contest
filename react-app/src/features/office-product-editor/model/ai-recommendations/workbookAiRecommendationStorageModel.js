import { toTrimmedString } from '../../../../common/utils/text';
import { toUniqueStrings } from '../../../../common/utils/array';

const STORAGE_VERSION = 1;

function createStorageKey(workbookFingerprint) {
  const key = toTrimmedString(workbookFingerprint);
  return key ? `office-product-editor:ai-recommendations:${key}` : '';
}

function sanitizeRecommendation(recommendation) {
  return {
    id: toTrimmedString(recommendation?.id),
    groupType: toTrimmedString(recommendation?.groupType),
    title: toTrimmedString(recommendation?.title),
    reason: toTrimmedString(recommendation?.reason),
    relatedRowIds: toUniqueStrings(recommendation?.relatedRowIds),
  };
}

function sanitizeState(state) {
  return {
    recommendations: Array.isArray(state?.recommendations)
      ? state.recommendations.map(sanitizeRecommendation).filter((entry) => entry.id !== '')
      : [],
    analysisMode: toTrimmedString(state?.analysisMode) || 'idle',
    analysisMessage: toTrimmedString(state?.analysisMessage),
    activeRecommendationId: toTrimmedString(state?.activeRecommendationId) || null,
  };
}

export function readStoredWorkbookAiRecommendationState(storage, workbookFingerprint) {
  const key = createStorageKey(workbookFingerprint);

  if (!storage || !key) {
    return null;
  }

  const rawValue = storage.getItem(key);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (parsed?.version !== STORAGE_VERSION) {
      return null;
    }

    return sanitizeState(parsed);
  } catch {
    return null;
  }
}

export function writeStoredWorkbookAiRecommendationState(storage, workbookFingerprint, state) {
  const key = createStorageKey(workbookFingerprint);

  if (!storage || !key) {
    return;
  }

  storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, ...sanitizeState(state) }));
}
