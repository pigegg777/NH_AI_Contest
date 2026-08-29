import { normalizeCartItemRefs } from '../../storefront-view/model/cart/cartItemModel';

const CART_STORAGE_KEY = 'nh-storefront-cart';

/**
 * 장바구니는 손님 기기에만 남는다. 저장소는 인자로 받아 브라우저 없이도
 * 테스트되게 하고, 시크릿 창이나 저장소 차단처럼 읽고쓰기가 통째로 실패하는
 * 경우에도 페이지가 죽지 않도록 전부 삼킨다 — 장바구니를 잃는 것이 상품
 * 목록을 못 보는 것보다 낫다.
 */
export function readStoredCart(storage) {
  try {
    const raw = storage?.getItem(CART_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return normalizeCartItemRefs(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeStoredCart(storage, refs) {
  try {
    if (!Array.isArray(refs) || refs.length === 0) {
      storage?.removeItem(CART_STORAGE_KEY);
      return;
    }

    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(refs));
  } catch {
    // 저장 실패는 조용히 넘긴다. 이번 세션 동안은 화면 상태로 계속 쓸 수 있다.
  }
}
