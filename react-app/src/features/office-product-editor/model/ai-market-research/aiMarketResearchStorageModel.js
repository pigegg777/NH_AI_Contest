import { toTrimmedString } from '../../../../common/utils/text';
import { toNumberOrNull } from '../../../../common/utils/number';

const STORAGE_VERSION = 1;

function createStorageKey(officeCode) {
  const key = toTrimmedString(officeCode);
  return key ? `office-product-editor:ai-market-research:${key}` : '';
}

function sanitizePriceRange(priceRange) {
  if (!priceRange || typeof priceRange !== 'object') {
    return null;
  }

  const minKrw = toNumberOrNull(priceRange.minKrw);
  const maxKrw = toNumberOrNull(priceRange.maxKrw);
  const unit = toTrimmedString(priceRange.unit);

  if (minKrw === null || maxKrw === null || unit === '') {
    return null;
  }

  return { minKrw, maxKrw, unit };
}

function sanitizePriceSources(priceSources) {
  if (!Array.isArray(priceSources)) {
    return [];
  }

  return priceSources
    .map((source) => {
      const productName = toTrimmedString(source?.productName);

      return {
        url: toTrimmedString(source?.url),
        site: toTrimmedString(source?.site),
        ...(productName ? { productName } : {}),
        priceKrw: toNumberOrNull(source?.priceKrw),
        observedDate: toTrimmedString(source?.observedDate) || null,
      };
    })
    .filter((source) => source.url !== '');
}

function sanitizeNewsArticles(newsArticles) {
  if (!Array.isArray(newsArticles)) {
    return [];
  }

  return newsArticles
    .map((article) => ({
      title: toTrimmedString(article?.title),
      summary: toTrimmedString(article?.summary),
      url: toTrimmedString(article?.url),
      site: toTrimmedString(article?.site),
      publishedDate: toTrimmedString(article?.publishedDate) || null,
    }))
    .filter((article) => article.url !== '' && article.title !== '');
}

function sanitizePriceComparison(priceComparison) {
  if (!priceComparison || typeof priceComparison !== 'object') {
    return null;
  }

  const dataProductName = toTrimmedString(priceComparison.dataProductName);
  const dataPriceKrw = toNumberOrNull(priceComparison.dataPriceKrw);
  const marketMinKrw = toNumberOrNull(priceComparison.marketMinKrw);
  const marketMaxKrw = toNumberOrNull(priceComparison.marketMaxKrw);

  if (dataProductName === '' || dataPriceKrw === null || marketMinKrw === null || marketMaxKrw === null) {
    return null;
  }

  return {
    dataProductName,
    dataPriceKrw,
    marketMinKrw,
    marketMaxKrw,
    differenceKrw: toNumberOrNull(priceComparison.differenceKrw),
    note: toTrimmedString(priceComparison.note),
  };
}

function sanitizeSearchQueries(searchQueries) {
  if (!Array.isArray(searchQueries)) {
    return [];
  }

  return searchQueries
    .map((query) => toTrimmedString(query))
    .filter((query) => query !== '');
}

function sanitizeReport(report) {
  if (!report || typeof report !== 'object') {
    return null;
  }

  return {
    understoodQuery: toTrimmedString(report.understoodQuery),
    clarificationNeeded: toTrimmedString(report.clarificationNeeded) || null,
    dataFound: report.dataFound === true,
    priceRange: sanitizePriceRange(report.priceRange),
    priceSources: sanitizePriceSources(report.priceSources),
    newsArticles: sanitizeNewsArticles(report.newsArticles),
    priceComparison: sanitizePriceComparison(report.priceComparison),
    searchQueries: sanitizeSearchQueries(report.searchQueries),
  };
}

function sanitizeState(state) {
  return {
    activeQuery: toTrimmedString(state?.activeQuery),
    mode: toTrimmedString(state?.mode) || 'idle',
    report: sanitizeReport(state?.report),
    message: toTrimmedString(state?.message),
  };
}

export function readStoredAiMarketResearchState(storage, officeCode) {
  const key = createStorageKey(officeCode);

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

export function writeStoredAiMarketResearchState(storage, officeCode, state) {
  const key = createStorageKey(officeCode);

  if (!storage || !key) {
    return;
  }

  storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, ...sanitizeState(state) }));
}
