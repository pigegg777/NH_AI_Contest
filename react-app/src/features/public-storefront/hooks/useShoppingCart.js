import { useEffect, useState } from 'react';

import {
  addCartItemRef,
  removeCartItemKeys,
} from '../../storefront-view/model/cart/cartItemModel';
import { readStoredCart, writeStoredCart } from '../model/cartStorageModel';

function getStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    // 저장소가 차단된 브라우저. 이번 세션 동안만 담기가 유지된다.
    return null;
  }
}

/**
 * 장바구니를 손님 기기에 들고 있는다. storefront-view 는 순수하게 두고
 * 저장소 접근은 여기에만 둔다 — 빌더는 이 훅을 쓰지 않으므로 미리보기에
 * 장바구니가 생기지 않는다.
 */
export function useShoppingCart() {
  const [cartItemRefs, setCartItemRefs] = useState(() => readStoredCart(getStorage()));

  useEffect(() => {
    writeStoredCart(getStorage(), cartItemRefs);
  }, [cartItemRefs]);

  return {
    cartItemRefs,
    addToCart: (product) => setCartItemRefs((current) => addCartItemRef(current, product)),
    removeCartItems: (keys) => setCartItemRefs((current) => removeCartItemKeys(current, keys)),
  };
}
