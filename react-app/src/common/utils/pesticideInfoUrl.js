import { toTrimmedString } from './text';

const PSIS_PESTICIDE_SEARCH_URL =
  'https://psis.rda.go.kr/psis/agc/res/agchmRegistStusLst.ps';

function extractPesticideSearchName(productName) {
  return toTrimmedString(productName).split(/[\s(0-9]/u, 1)[0] ?? '';
}

export function buildPesticideInfoUrl(product) {
  const largeCategory = toTrimmedString(product?.large_category);
  const productName = extractPesticideSearchName(product?.product_name);

  if (largeCategory !== '농약' || !productName) {
    return '';
  }

  return (
    `${PSIS_PESTICIDE_SEARCH_URL}?sAgBrandNm=${encodeURIComponent(productName)}` +
    '&sType=A&pageIndex=1'
  );
}
