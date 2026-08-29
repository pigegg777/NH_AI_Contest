import { createContext, useContext } from 'react';

/**
 * 장바구니를 쓰는 화면만 이 값을 채운다. 빌더 미리보기는 채우지 않으므로
 * useCart() 가 null 을 돌려주고, 담기 UI 는 아예 렌더되지 않는다 — 사장님
 * 편집 화면에 손님 장바구니가 생기는 일이 구조적으로 막힌다.
 *
 * prop 으로 내리지 않는 이유는 담기 버튼이 CardGridSection -> ProductCard ->
 * CardHeaderSection 3단 아래에 있어서다. 중간 두 컴포넌트는 장바구니를 알
 * 필요가 없다.
 */
const CartContext = createContext(null);

export const CartProvider = CartContext.Provider;

export function useCart() {
  return useContext(CartContext);
}
