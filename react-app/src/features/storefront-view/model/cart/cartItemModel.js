import { toTrimmedString } from '../../../../common/utils/text';
import { formatFieldDisplayValue, hasRenderableValue } from '../card-grid-section/cardFieldRenderModel';
import { PRICE_FIELD_KEYS } from '../config-schema/mobileUiTreeModel';
import { STOREFRONT_FIELD_LABELS } from '../config-schema/storefrontConfigModel';

/**
 * 장바구니는 상품을 가리키기만 하고 값은 복사하지 않는다. 가격·분류는 볼
 * 때마다 현재 상품 행에서 다시 읽으므로, 사장님이 단가를 고치면 손님
 * 장바구니에도 바로 반영된다.
 *
 * 키는 상품코드를 먼저 쓴다. 엑셀을 다시 올리면 row_id 는 새로 생기지만
 * 상품코드는 같은 상품이면 유지되기 때문이다. 코드가 없는 행은 숨김 상품이
 * 쓰는 것과 같은 규칙(상품명 + 규격)으로 떨어진다.
 */
export function buildCartItemKey(product) {
  const productCode = toTrimmedString(product?.product_code);

  if (productCode) {
    return `code:${productCode}`;
  }

  const productName = toTrimmedString(product?.product_name);

  if (!productName) {
    return '';
  }

  return `name:${productName}|${toTrimmedString(product?.spec)}`;
}

function toCartItemRef(product) {
  const productCode = toTrimmedString(product?.product_code);
  const productName = toTrimmedString(product?.product_name);

  return productCode
    ? { product_code: productCode, product_name: productName, spec: toTrimmedString(product?.spec) }
    : { product_name: productName, spec: toTrimmedString(product?.spec) };
}

export function normalizeCartItemRefs(value) {
  const seen = new Set();
  const refs = [];

  for (const entry of Array.isArray(value) ? value : []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    const key = buildCartItemKey(entry);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    refs.push(toCartItemRef(entry));
  }

  return refs;
}

export function isProductInCart(refs, product) {
  const key = buildCartItemKey(product);

  if (!key) {
    return false;
  }

  return (Array.isArray(refs) ? refs : []).some((ref) => buildCartItemKey(ref) === key);
}

/** 이미 담겼거나 가리킬 수 없는 상품이면 받은 배열을 그대로 돌려준다. */
export function addCartItemRef(refs, product) {
  const current = Array.isArray(refs) ? refs : [];

  if (!buildCartItemKey(product) || isProductInCart(current, product)) {
    return current;
  }

  return [...current, toCartItemRef(product)];
}

export function removeCartItemKeys(refs, keys) {
  const current = Array.isArray(refs) ? refs : [];
  const removing = new Set(Array.isArray(keys) ? keys : []);

  if (removing.size === 0) {
    return current;
  }

  return current.filter((ref) => !removing.has(buildCartItemKey(ref)));
}

function buildPriceEntries(row) {
  return PRICE_FIELD_KEYS.filter((field) => hasRenderableValue(row?.[field])).map((field) => ({
    field,
    label: STOREFRONT_FIELD_LABELS[field] || field,
    value: formatFieldDisplayValue(field, row[field]),
  }));
}

/**
 * 담아둔 순서대로, 현재 상품 행과 맞춰 표시용 항목을 만든다. 상품이 목록에서
 * 사라졌으면 지우지 않고 isUnavailable 로 표시한다 — 손님이 직접 담은 것을
 * 말없이 없애지 않기 위해서다. 그때 남는 것은 ref 에 있는 이름과 규격뿐이다.
 */
export function buildCartDisplayItems(refs, productRows) {
  const rowsByKey = new Map();

  for (const row of Array.isArray(productRows) ? productRows : []) {
    const key = buildCartItemKey(row);

    if (key && !rowsByKey.has(key)) {
      rowsByKey.set(key, row);
    }
  }

  return (Array.isArray(refs) ? refs : []).map((ref) => {
    const key = buildCartItemKey(ref);
    const row = rowsByKey.get(key) ?? null;

    return {
      key,
      isUnavailable: row === null,
      productName: toTrimmedString(row?.product_name || ref?.product_name),
      spec: toTrimmedString(row?.spec ?? ref?.spec),
      largeCategory: toTrimmedString(row?.large_category),
      mediumCategory: toTrimmedString(row?.medium_category),
      prices: row ? buildPriceEntries(row) : [],
    };
  });
}
