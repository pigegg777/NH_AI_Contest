import { toTrimmedString } from '../../../../common/utils/text';
import { postAuthenticatedJson } from '../../../../common/services/postAuthenticatedJson';

const AI_SIMILARITY_EXTRACTION_ENDPOINT = '/api/ai-similarity-extraction/analyze';

export async function requestAiSimilarityExtractionMatches({
  officeCode,
  rows,
  tableNameMode,
  userHint,
}) {
  const body = await postAuthenticatedJson(
    AI_SIMILARITY_EXTRACTION_ENDPOINT,
    {
      officeCode: toTrimmedString(officeCode),
      tableNameMode: toTrimmedString(tableNameMode),
      userHint: toTrimmedString(userHint),
      rows: Array.isArray(rows) ? rows : [],
    },
    { failureLabel: 'AI similarity extraction request' },
  );

  return {
    recommendations: Array.isArray(body?.recommendations) ? body.recommendations : [],
  };
}
