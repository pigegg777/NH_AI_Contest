import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';

function normalizePriceRange(priceRange) {
  if (!priceRange || typeof priceRange !== 'object') {
    return null;
  }

  const minKrw = toNumberOrNull(priceRange.min_krw);
  const maxKrw = toNumberOrNull(priceRange.max_krw);
  const unit = toTrimmedString(priceRange.unit);

  if (minKrw === null || maxKrw === null || unit === '') {
    return null;
  }

  return { minKrw, maxKrw, unit };
}

function normalizePriceSources(priceSources) {
  if (!Array.isArray(priceSources)) {
    return [];
  }

  return priceSources
    .map((source) => ({
      url: toTrimmedString(source?.url),
      site: toTrimmedString(source?.site),
      priceKrw: toNumberOrNull(source?.price_krw),
      observedDate: toTrimmedString(source?.observed_date) || null,
    }))
    .filter((source) => source.url !== '');
}

function normalizeNewsArticles(newsArticles) {
  if (!Array.isArray(newsArticles)) {
    return [];
  }

  return newsArticles
    .map((article) => ({
      title: toTrimmedString(article?.title),
      summary: toTrimmedString(article?.summary),
      url: toTrimmedString(article?.url),
      site: toTrimmedString(article?.site),
      publishedDate: toTrimmedString(article?.published_date) || null,
    }))
    .filter((article) => article.url !== '' && article.title !== '');
}

function normalizePriceComparison(priceComparison) {
  if (!priceComparison || typeof priceComparison !== 'object') {
    return null;
  }

  const dataProductName = toTrimmedString(priceComparison.data_product_name);
  const dataPriceKrw = toNumberOrNull(priceComparison.data_price_krw);
  const marketMinKrw = toNumberOrNull(priceComparison.market_min_krw);
  const marketMaxKrw = toNumberOrNull(priceComparison.market_max_krw);

  if (dataProductName === '' || dataPriceKrw === null || marketMinKrw === null || marketMaxKrw === null) {
    return null;
  }

  return {
    dataProductName,
    dataPriceKrw,
    marketMinKrw,
    marketMaxKrw,
    differenceKrw: toNumberOrNull(priceComparison.difference_krw),
    note: toTrimmedString(priceComparison.note),
  };
}

function normalizeSearchQueries(searchQueries) {
  if (!Array.isArray(searchQueries)) {
    return [];
  }

  return [
    ...new Set(
      searchQueries
        .map((query) => toTrimmedString(query))
        .filter((query) => query !== ''),
    ),
  ];
}

export function normalizeMarketResearchReport(payload, searchQueries = []) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};

  return {
    understoodQuery: toTrimmedString(safePayload.understood_query),
    clarificationNeeded: toTrimmedString(safePayload.clarification_needed) || null,
    dataFound: safePayload.data_found === true,
    priceRange: normalizePriceRange(safePayload.price_range),
    priceSources: normalizePriceSources(safePayload.price_sources),
    newsArticles: normalizeNewsArticles(safePayload.news_articles),
    priceComparison: normalizePriceComparison(safePayload.price_comparison),
    searchQueries: normalizeSearchQueries(searchQueries),
  };
}
