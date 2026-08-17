import { toTrimmedString } from '../../../../common/utils/text';
import { requestAiMarketResearchReport } from '../../services/ai-market-research/aiMarketResearchClient';
import { findAiMarketResearchMatchingProducts } from './aiMarketResearchProductMatchModel';

function computeFallbackPriceComparison(matchedProducts, priceRange) {
  const matched = matchedProducts.find((product) => product.priceKrw !== null);

  if (!matched || !priceRange) {
    return null;
  }

  const marketMidKrw = Math.round((priceRange.minKrw + priceRange.maxKrw) / 2);
  const differenceKrw = marketMidKrw - matched.priceKrw;
  const note =
    differenceKrw > 0
      ? '등록가가 시세보다 낮습니다.'
      : differenceKrw < 0
        ? '등록가가 시세보다 높습니다.'
        : '등록가가 시세와 비슷합니다.';

  return {
    dataProductName: matched.productName,
    dataPriceKrw: matched.priceKrw,
    marketMinKrw: priceRange.minKrw,
    marketMaxKrw: priceRange.maxKrw,
    differenceKrw,
    note,
  };
}

export async function analyzeAiMarketResearchQuery(
  productQuery,
  { officeCode, rows } = {},
) {
  const safeProductQuery = toTrimmedString(productQuery);

  if (safeProductQuery === '') {
    return { mode: 'idle', report: null };
  }

  if (!toTrimmedString(officeCode)) {
    return { mode: 'unavailable', report: null };
  }

  try {
    const matchedProducts = findAiMarketResearchMatchingProducts(
      rows,
      safeProductQuery,
    );
    const { report } = await requestAiMarketResearchReport({
      officeCode,
      productQuery: safeProductQuery,
      matchedProducts,
    });

    return {
      mode: 'openai',
      report: {
        ...report,
        priceComparison:
          report?.priceComparison ??
          computeFallbackPriceComparison(matchedProducts, report?.priceRange),
      },
    };
  } catch (error) {
    return {
      mode: 'error',
      report: null,
      message:
        error instanceof Error
          ? error.message
          : '시장조사 요청에 실패했습니다.',
    };
  }
}
