import { useMemo, useState } from 'react';

import {
  buildCartDisplayItems,
  buildVisibleFieldsByCartKey,
} from '../../../model/cart/cartItemModel';
import styles from './CartPanel.module.css';

/**
 * 담아둔 목록. 합계를 내지 않는다 — 과세/면세/영세가 행마다 달라서 더한 값이
 * 어떤 손님에게도 맞지 않는다. 가격은 행이 가진 것을 그대로 나열한다.
 */
export default function CartPanel({
  cartItemRefs,
  productRows,
  // 분류마다 어떤 가격을 노출하는지 여기서 정한다. 이것이 없으면 장바구니가
  // 사장님이 끈 가격까지 보여준다.
  categoryConfigs,
  onRemoveCartItems,
  onClose,
}) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  // 전체 상품을 훑는 계산이라 장바구니를 열었을 때만, 그리고 재료가 바뀔
  // 때만 한다. 이 패널은 열려 있는 동안에만 붙어 있다.
  const visibleFieldsByCartKey = useMemo(
    () => buildVisibleFieldsByCartKey(categoryConfigs, productRows),
    [categoryConfigs, productRows],
  );
  const items = buildCartDisplayItems(cartItemRefs, productRows, visibleFieldsByCartKey);
  const selectedCount = items.filter((item) => selectedKeys.has(item.key)).length;

  function toggleKey(key) {
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }

  function handleRemoveSelected() {
    onRemoveCartItems([...selectedKeys]);
    setSelectedKeys(new Set());
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="장바구니">
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>장바구니 {items.length > 0 ? `(${items.length})` : ''}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            닫기
          </button>
        </header>

        {items.length === 0 ? (
          <p className={styles.empty} data-testid="storefront-cart-empty">
            담은 상품이 없습니다.
          </p>
        ) : (
          <>
            <ul className={styles.list}>
              {items.map((item) => (
                <li
                  key={item.key}
                  className={`${styles.item} ${item.isUnavailable ? styles.itemUnavailable : ''}`}
                  data-unavailable={item.isUnavailable ? 'true' : 'false'}
                >
                  <label className={styles.itemLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedKeys.has(item.key)}
                      onChange={() => toggleKey(item.key)}
                    />
                    <span className={styles.itemBody}>
                      <span className={styles.itemName}>
                        {item.productName}
                        {item.spec ? <span className={styles.itemSpec}> {item.spec}</span> : null}
                      </span>

                      {item.isUnavailable ? (
                        <span className={styles.itemNotice}>판매 종료</span>
                      ) : (
                        <>
                          {item.largeCategory || item.mediumCategory ? (
                            <span className={styles.itemCategories}>
                              {[item.largeCategory, item.mediumCategory].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                          {item.prices.length > 0 ? (
                            <span className={styles.itemPrices}>
                              {item.prices.map((price) => (
                                <span key={price.field} className={styles.itemPrice}>
                                  <span className={styles.itemPriceLabel}>{price.label}</span>
                                  <span className={styles.itemPriceValue}>{price.value}</span>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <footer className={styles.footer}>
              <button
                type="button"
                className={styles.removeButton}
                onClick={handleRemoveSelected}
                disabled={selectedCount === 0}
              >
                선택 삭제{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
