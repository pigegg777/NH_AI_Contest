export function filterRowsByActiveAiSimilarityExtractionMatch(rows, recommendations, activeRecommendationId) {
  if (!activeRecommendationId) {
    return rows;
  }

  const activeRecommendation = recommendations.find(
    (recommendation) => recommendation.id === activeRecommendationId,
  );

  if (!activeRecommendation) {
    return rows;
  }

  const relatedRowIdSet = new Set(activeRecommendation.relatedRowIds);

  return rows.filter((row) => relatedRowIdSet.has(row.row_id));
}
