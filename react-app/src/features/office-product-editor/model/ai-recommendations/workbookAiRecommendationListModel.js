import { toTrimmedString } from '../../../../common/utils/text';
import { createAiRecommendation } from './workbookAiRecommendationModel';

export function normalizeOpenAiRecommendations(recommendations, rows) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  const validRowIds = new Set(
    rows.map((row) => toTrimmedString(row?.row_id)).filter(Boolean),
  );

  return recommendations
    .map((recommendation) => createAiRecommendation(recommendation))
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
}

const GROUP_TYPE_PRIORITY = {
  same_product: 0,
  similar_product: 1,
};

export function sortWorkbookAiRecommendations(recommendations) {
  return [...recommendations].sort((left, right) => {
    const leftPriority = GROUP_TYPE_PRIORITY[left.groupType] ?? 99;
    const rightPriority = GROUP_TYPE_PRIORITY[right.groupType] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title, 'ko-KR');
  });
}
