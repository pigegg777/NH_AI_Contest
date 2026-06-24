function isBlank(value) {
  return value == null || (typeof value === 'string' && value.trim() === '');
}

function stripHtml(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ');
}

function normalizeProductToken(value) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function buildVerificationNeedles(productName, foundName) {
  const clean = stripHtml(productName).replace(/\s+/g, ' ').trim();
  const noParen = clean.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = [clean, noParen, foundName]
    .map(normalizeProductToken)
    .filter(Boolean);

  const unique = [...new Set(tokens)];
  const longEnough = unique.filter((token) => token.length >= 4);
  if (longEnough.length > 0) {
    return longEnough;
  }

  const fallback = unique.sort((a, b) => b.length - a.length)[0];
  return fallback ? [fallback] : [];
}

function detailMatchesProduct({ productName, foundName, detailName, detailText }) {
  const needles = buildVerificationNeedles(productName, foundName);
  if (needles.length === 0) {
    return false;
  }

  const haystacks = [detailName, detailText]
    .map(normalizeProductToken)
    .filter(Boolean);

  if (haystacks.length === 0) {
    return false;
  }

  return needles.some((needle) => haystacks.some((haystack) => haystack.includes(needle)));
}

function isTargetProduct(product) {
  return (
    Array.isArray(product?.suppliers) &&
    product.suppliers.includes('팜한농') &&
    (isBlank(product.img_url) || isBlank(product.product_url))
  );
}

function buildUpdatePayload(product, { imgUrl, productUrl }) {
  const payload = {};

  if (isBlank(product?.img_url) && !isBlank(imgUrl)) {
    payload.img_url = imgUrl;
  }

  if (isBlank(product?.product_url) && !isBlank(productUrl)) {
    payload.product_url = productUrl;
  }

  return payload;
}

module.exports = {
  buildUpdatePayload,
  detailMatchesProduct,
  isBlank,
  isTargetProduct,
};
