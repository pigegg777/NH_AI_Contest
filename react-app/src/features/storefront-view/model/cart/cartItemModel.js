import { toTrimmedString } from '../../../../common/utils/text';
import { formatFieldDisplayValue, hasRenderableValue } from '../card-grid-section/cardFieldRenderModel';
import { buildSections } from '../config-schema/sectionMatching';
import { PRICE_FIELD_KEYS } from '../config-schema/mobileUiTreeModel';
import { DEFAULT_CARD_FIELDS, STOREFRONT_FIELD_LABELS } from '../config-schema/storefrontConfigModel';

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

/**
 * 상품이 속한 분류에서 카드가 실제로 그리는 필드를 장바구니키로 찾을 수 있게
 * 만든다.
 *
 * 분류 매칭을 여기서 다시 하지 않는 것이 핵심이다. 어느 행이 어느 분류에
 * 속하는지는 matchesCategoryConfig 가 중분류 선택까지 따져 정하는데, 그
 * 규칙을 장바구니가 따로 구현하면 한쪽만 고쳐졌을 때 조용히 어긋난다.
 * 그래서 화면과 같은 buildSections 를 쓴다.
 *
 * 다만 넘겨받는 것은 화면에 지금 보이는 상품이 아니라 전체 상품이어야 한다.
 * 뷰의 sectionEntries 는 고른 대분류·중분류·검색어로 걸러진 목록이라, 그것을
 * 쓰면 지금 보고 있지 않은 분류의 장바구니 항목은 노출 정보를 못 찾아 가격이
 * 사라진다 — 분류를 바꿀 때마다 가격이 깜빡였다. 장바구니에 담긴 상품은
 * 어느 분류를 보고 있든 같은 가격을 보여줘야 한다.
 *
 * 아직 설정하지 않은 분류도 buildSections 가 알아서 채운다 — 그때 카드는
 * 데이터에 있는 필드를 전부 그리므로 장바구니도 같아진다. DEFAULT_CARD_FIELDS
 * 는 그마저 없을 때의 마지막 안전망이다.
 */
export function buildVisibleFieldsByCartKey(categoryConfigs, productRows) {
  const visibleFieldsByKey = new Map();

  for (const section of buildSections(categoryConfigs, productRows)) {
    const fields = Array.isArray(section?.fields) ? section.fields : DEFAULT_CARD_FIELDS;

    for (const product of Array.isArray(section?.products) ? section.products : []) {
      const key = buildCartItemKey(product);

      if (key && !visibleFieldsByKey.has(key)) {
        visibleFieldsByKey.set(key, fields);
      }
    }
  }

  return visibleFieldsByKey;
}

/**
 * 사장님이 카드에서 끈 가격은 장바구니에도 나오지 않는다. 데이터에 값이 있는
 * 것과 손님에게 보여주기로 한 것은 다른 이야기다.
 *
 * visibleFields 를 못 찾았다면 그 상품은 어느 섹션에도 안 잡힌 것이고, 손님
 * 화면에는 카드 자체가 없다. 이때는 하나도 보여주지 않는다 — 노출 여부를
 * 모를 때 드러내는 쪽으로 기울면 방금 고친 버그를 되풀이하게 된다.
 */
function buildPriceEntries(row, visibleFields) {
  const allowed = Array.isArray(visibleFields) ? visibleFields : [];

  return PRICE_FIELD_KEYS.filter(
    (field) => allowed.includes(field) && hasRenderableValue(row?.[field]),
  ).map((field) => ({
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
export function buildCartDisplayItems(refs, productRows, visibleFieldsByCartKey) {
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
      prices: row ? buildPriceEntries(row, visibleFieldsByCartKey?.get(key)) : [],
    };
  });
}
