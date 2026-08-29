import CartIcon from './CartIcon';
import { useCart } from './cartContext';
import styles from './CartPanel.module.css';

/**
 * 장바구니 진입점. 화면 오른쪽 아래에 떠 있어서, 사장님이 헤더 구성을 어떻게
 * 바꾸든 자리를 잃지 않는다. 장바구니를 쓰지 않는 화면(빌더 미리보기)에서는
 * context 가 비어 있어 아무것도 그리지 않는다.
 */
export default function CartOpenButton() {
  const cart = useCart();

  if (!cart) {
    return null;
  }

  return (
    <button
      type="button"
      className={`${styles.openButton} ${cart.isInert ? styles.openButtonInert : ''}`}
      onClick={cart.openCart}
      tabIndex={cart.isInert ? -1 : undefined}
      aria-hidden={cart.isInert ? 'true' : undefined}
      aria-label={`장바구니 열기, 담은 상품 ${cart.itemCount}개`}
      data-testid="storefront-cart-open"
    >
      <CartIcon className={styles.openButtonIcon} size={24} />
      {cart.itemCount > 0 ? (
        <span className={styles.openButtonCount}>{cart.itemCount}</span>
      ) : null}
    </button>
  );
}
