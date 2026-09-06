import { toTrimmedString } from '../../../../common/utils/text';
import { postAuthenticatedJson } from '../../../../common/services/postAuthenticatedJson';

const AI_MARKET_RESEARCH_ENDPOINT = '/api/ai-market-research/analyze';

export async function requestAiMarketResearchReport({ officeCode, productQuery, matchedProducts = [] }) {
  const body = await postAuthenticatedJson(
    AI_MARKET_RESEARCH_ENDPOINT,
    {
      officeCode: toTrimmedString(officeCode),
      productQuery: toTrimmedString(productQuery),
      matchedProducts,
    },
    { failureLabel: 'AI market research request' },
  );

  return { report: body?.report ?? null };
}
