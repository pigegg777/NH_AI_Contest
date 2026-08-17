import { toTrimmedString } from '../../../../common/utils/text';
import { toUniqueStrings } from '../../../../common/utils/array';

const GROUP_TYPE_PRIORITY = {
  same_product: 0,
  similar_product: 1,
};

const ALLOWED_GROUP_TYPES = new Set(['same_product', 'similar_product']);
const DEFAULT_GROUP_TYPE = 'same_product';

export function createAiSimilarityExtractionMatch(input) {
  function buildRecommendationId() {
    const relatedRowIds = toUniqueStrings(input.relatedRowIds);
    const title = toTrimmedString(input.title);

    return input.id ?? `${title || 'recommendation'}:${relatedRowIds.join(',')}`;
  }

  function normalizeGroupType() {
    const normalizedGroupType = toTrimmedString(input.groupType).toLowerCase();

    return ALLOWED_GROUP_TYPES.has(normalizedGroupType)
      ? normalizedGroupType
      : DEFAULT_GROUP_TYPE;
  }

  return {
    id: buildRecommendationId(),
    groupType: normalizeGroupType(),
    title: toTrimmedString(input.title),
    reason: toTrimmedString(input.reason),
    relatedRowIds: toUniqueStrings(input.relatedRowIds),
  };
}

export function sanitizeAiSimilarityExtractionMatches(recommendations, rows) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  const validRowIds = new Set(
    rows.map((row) => toTrimmedString(row?.row_id)).filter(Boolean),
  );

  const normalized = recommendations
    .map((recommendation) => createAiSimilarityExtractionMatch(recommendation))
    .map((recommendation) => ({
      ...recommendation,
      relatedRowIds: recommendation.relatedRowIds.filter((rowId) =>
        validRowIds.has(rowId),
      ),
    }))
    .filter(
      (recommendation) =>
        recommendation.title !== '' &&
        recommendation.reason !== '' &&
        recommendation.relatedRowIds.length > 0,
    );

  return normalized.sort((left, right) => {
    const leftPriority = GROUP_TYPE_PRIORITY[left.groupType] ?? 99;
    const rightPriority = GROUP_TYPE_PRIORITY[right.groupType] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title, 'ko-KR');
  });
}
