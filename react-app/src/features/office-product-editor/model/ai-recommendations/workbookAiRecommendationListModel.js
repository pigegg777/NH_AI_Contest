import { toTrimmedString } from '../../../../common/utils/text';
import { createAiRecommendation } from './workbookAiRecommendationModel';

const SEVERITY_PRIORITY = {
  high: 0,
  medium: 1,
  low: 2,
};

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

export function sortWorkbookAiRecommendations(recommendations) {
  return [...recommendations].sort((left, right) => {
    const leftPriority = SEVERITY_PRIORITY[left.severity] ?? 99;
    const rightPriority = SEVERITY_PRIORITY[right.severity] ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.title.localeCompare(right.title, 'ko-KR');
  });
}
