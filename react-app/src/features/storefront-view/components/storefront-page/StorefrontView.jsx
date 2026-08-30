import { useEffect, useRef, useState } from 'react';

import { useStorefrontView } from '../../hooks/useStorefrontView';
import nhCyberSymbolUrl from '../../../../common/assets/nh_cyber_symbol.png';
import { isProductInCart } from '../../model/cart/cartItemModel';
import CartOpenButton from './cart/CartOpenButton';
import CartPanel from './cart/CartPanel';
import { CartProvider } from './cart/cartContext';
import {
  buildRenderableMobileUiTree,
  resolveSlotBlocks,
  HEADER_SLOT_ORDER,
  BODY_SLOT_ORDER,
} from '../../model/view/storefrontViewLayoutModel';
import { buildStorefrontViewCssVars } from '../../model/view/storefrontViewStyleModel';
import CardGridSection from './product-cards/CardGridSection';
import CategoryInformationPanel from './category-nav/CategoryInformationPanel';
import DesktopCategoryRail from './category-nav/DesktopCategoryRail';
import HelperBlock from './blocks/HelperBlock';
import InformationNavigationBlock from './category-nav/InformationNavigationBlock';
import OfficeInformationPanel from './category-nav/OfficeInformationPanel';
import StorefrontViewBlock from './blocks/StorefrontViewBlock';
import styles from './StorefrontView.module.css';

export default function StorefrontView({
  config,
  productRows,
  officeName,
  nhName,
  selectedSectionName,
  productUpdatedAt,
  // 손님 화면은 이 셋을 넘겨 장바구니를 실제로 동작시킨다.
  cartItemRefs,
  onAddToCart,
  onRemoveCartItems,
  // 빌더 미리보기는 핸들러 없이 이것만 켠다. 버튼이 실제와 똑같이 보이되
  // 눌리지 않는다 — 사장님이 카드 우하단이 가려지는 것을 보면서 디자인하되,
  // 사장님 브라우저에 손님 장바구니가 쌓이지는 않게.
  isCartPreview = false,
  // 지금 어느 대분류를 보여주고 있는지 알려준다. 손님 화면에서는 아무도 듣지
  // 않고, 빌더는 이것으로 '적용된 디자인'을 화면과 맞춘다.
  onActiveCategoryChange,
}) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const isCartInteractive = typeof onAddToCart === 'function';
  const isCartVisible = isCartInteractive || isCartPreview;
  const cartRefs = isCartInteractive && Array.isArray(cartItemRefs) ? cartItemRefs : [];
  const noop = () => {};
  const cartValue = isCartVisible
    ? {
        isInert: !isCartInteractive,
        onAddToCart: isCartInteractive ? onAddToCart : noop,
        isInCart: (product) => isCartInteractive && isProductInCart(cartRefs, product),
        itemCount: cartRefs.length,
        openCart: isCartInteractive ? () => setIsCartOpen(true) : noop,
      }
    : null;
  const view = useStorefrontView({
    config,
    productRows,
    officeName,
    nhName,
    selectedSectionName,
    productUpdatedAt,
  });
  // 콜백은 부모가 매번 새로 만들 수 있으므로 의존성에서 뺀다. 그러지 않으면
  // 대분류가 그대로인데도 부모가 다시 그릴 때마다 알림이 나간다.
  const activeCategoryListenerRef = useRef(onActiveCategoryChange);

  useEffect(() => {
    activeCategoryListenerRef.current = onActiveCategoryChange;
  });

  // 안내를 띄우고 있으면 카드가 한 장도 그려지지 않는다. 그때 분류 이름을
  // 그대로 올려보내면 빌더가 '적용된 카드 디자인'을 보여주는데, 화면에는 그
  // 카드가 없다. 보여줄 카드가 없다는 사실까지 같이 알린다.
  const activeCategoryForListeners = view.isInformationIntroActive
    ? ''
    : view.activeSectionTitle;

  useEffect(() => {
    activeCategoryListenerRef.current?.(activeCategoryForListeners);
  }, [activeCategoryForListeners]);

  const brandLogoSrc = config?.navConfig?.logoUrl || nhCyberSymbolUrl;
  const renderableMobileUiTree = buildRenderableMobileUiTree(
    view.mobileUiTree,
    view.catalogSectionEntries.length > 0 || view.hasInformationContent,
  );

  function renderSlot(slot) {
    return resolveSlotBlocks(renderableMobileUiTree, slot).map((block) => {
      const elementKey = `${slot}-${block.id}`;

      return (
        <StorefrontViewBlock
          key={elementKey}
          block={block}
          view={view}
          brandLogoSrc={brandLogoSrc}
          elementKey={elementKey}
        />
      );
    });
  }

  return (
    <CartProvider value={cartValue}>
    <div className={styles.pageShell}>
    <div
      className={styles.page}
      data-testid="storefront-page"
      style={buildStorefrontViewCssVars(view)}
    >
      <header className={styles.hero}>
        {HEADER_SLOT_ORDER.map((slot) => renderSlot(slot))}
        <InformationNavigationBlock view={view} />
      </header>

      <div
        className={`${styles.bodyShell} ${!view.canRenderDesktopCategoryRail ? styles.bodyShellSolo : ''}`}
      >
        {view.canRenderDesktopCategoryRail ? (
          <DesktopCategoryRail
            catalogSectionEntries={view.catalogSectionEntries}
            activeSectionTitle={view.activeSectionTitle}
            title={view.pageTitle}
            isOpen={view.isDesktopCategoryNavOpen}
            onToggle={() =>
              view.setIsDesktopCategoryNavOpen((current) => !current)
            }
            activeMediumCategory={view.activeMediumCategory}
            onSectionSelect={view.handleCategoryRailSectionSelect}
            onMediumSelect={view.handleCategoryRailMediumSelect}
          />
        ) : null}

        <div className={styles.contentColumn}>
          {BODY_SLOT_ORDER.map((slot) => {
            if (slot === 'bottom') {
              return null;
            }

            return renderSlot(slot);
          })}

          {view.isInformationIntroActive && view.activeInformationIntro?.kind === 'office' ? (
            <OfficeInformationPanel entries={view.activeInformationIntro.entries} />
          ) : null}

          {view.isInformationIntroActive && view.activeInformationIntro?.kind === 'category' ? (
            <CategoryInformationPanel
              categoryName={view.activeInformationIntro.categoryName}
              entries={view.activeInformationIntro.entries}
            />
          ) : null}

          {view.hasRenderableSections
            ? view.sectionEntries.map(({ section, sectionId }) => (
                <CardGridSection
                  key={sectionId}
                  sectionId={sectionId}
                  section={section}
                  fields={section?.fields}
                  cardStyle={section?.cardStyle}
                  bodySlots={section?.bodySlots}
                  sectionHeaderContent={view.sectionHeaderBlocks.map((block) => (
                    <HelperBlock key={`${sectionId}-${block.id}`} block={block} />
                  ))}
                />
              ))
            : null}

          {view.canRenderEmptyState ? (
            <div className={styles.emptyState}>
              찾으시는 자재가 없습니다. 검색어를 바꾸거나 다른 분류를 눌러보세요.
            </div>
          ) : null}

          {renderSlot('bottom')}
        </div>
      </div>
    </div>
    </div>

    {/* .pageShell 은 컨테이너 쿼리를 위해 container-type 을 갖는데, 그것이 함께
        거는 contain: layout 이 내부의 position: fixed 를 가둔다. 화면 구석에
        떠 있어야 하는 둘은 그 밖에 둔다. */}
    {isCartVisible ? <CartOpenButton /> : null}

    {isCartInteractive && isCartOpen ? (
      <CartPanel
        cartItemRefs={cartRefs}
        productRows={productRows}
        // 어떤 가격을 보여줄지는 분류 설정이 정한다. 걸러진 목록(view)이 아니라
        // 원본을 넘기는 것이 중요하다 — 지금 고른 분류에 따라 장바구니 가격이
        // 나타났다 사라지면 안 된다.
        categoryConfigs={config?.categoryConfigs}
        onRemoveCartItems={onRemoveCartItems}
        onClose={() => setIsCartOpen(false)}
      />
    ) : null}
    </CartProvider>
  );
}
