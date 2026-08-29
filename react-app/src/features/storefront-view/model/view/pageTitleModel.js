const PAGE_TITLE_SUFFIX = '농자재 정보';
const FALLBACK_PAGE_TITLE = '상품 안내';

/**
 * The title the storefront shows when the merchant has not written one, and the
 * placeholder their input box offers. Both must always say the same thing, so
 * the rule lives here rather than in each caller.
 */
export function buildDerivedPageTitle({ nhName, officeName }) {
  const orgName = [nhName, officeName]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join(' ');

  return orgName ? `${orgName} ${PAGE_TITLE_SUFFIX}` : FALLBACK_PAGE_TITLE;
}
