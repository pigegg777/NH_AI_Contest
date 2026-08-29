import CartIcon from './CartIcon';
import { useCart } from './cartContext';
import styles from '../product-cards/CardGridSection.module.css';

/**
 * 상품명 오른쪽의 담기 버튼.
 *
 * 장바구니를 쓰지 않는 화면에서는 context 가 비어 있어 아무것도 그리지 않고,
 * 빌더 미리보기(isInert)에서는 모양만 그대로 두고 클릭만 막는다 — 사장님이
 * 손님이 보는 화면을 그대로 보되, 사장님 브라우저에 장바구니가 쌓이지 않게.
 */
export default function CardCartAddButton({ product }) {
  const cart = useCart();

  if (!cart) {
    return null;
  }

  const isAdded = cart.isInCart(product);
  const productName = product?.product_name || '상품';

  return (
    <button
      type="button"
      className={`${styles.cardCartButton} ${cart.isInert ? styles.cardCartButtonInert : ''}`}
      onClick={() => cart.onAddToCart(product)}
      disabled={isAdded}
      // disabled 로 막으면 회색이 되어 실제와 다른 모습이 되므로 건드리지 않는다.
      tabIndex={cart.isInert ? -1 : undefined}
      aria-hidden={cart.isInert ? 'true' : undefined}
      aria-label={isAdded ? `${productName} 담김` : `${productName} 장바구니에 담기`}
      title={isAdded ? '장바구니에 담김' : '장바구니에 담기'}
      data-testid="storefront-cart-add"
    >
      <CartIcon className={styles.cardCartIcon} size={16} />
      <span className={styles.cardCartLabel}>
        {isAdded ? '장바구니에 담김' : '장바구니 담기'}
      </span>
    </button>
  );
}
