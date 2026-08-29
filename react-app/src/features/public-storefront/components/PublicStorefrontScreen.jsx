import StorefrontView from '../../storefront-view/components/storefront-page/StorefrontView';

/**
 * 빌더 미리보기도 이 화면을 그대로 쓴다. 그래서 장바구니를 여기서 켜지 않고
 * 공개 페이지가 넘겨줄 때만 켜지도록 그대로 흘려보낸다.
 */
export default function PublicStorefrontScreen({
  config,
  productRows,
  officeName = '',
  nhName = '',
  selectedSectionName = '',
  productUpdatedAt = '',
  cartItemRefs,
  onAddToCart,
  onRemoveCartItems,
  isCartPreview = false,
  onActiveCategoryChange,
}) {
  return (
    <StorefrontView
      config={config}
      productRows={productRows}
      officeName={officeName}
      nhName={nhName}
      selectedSectionName={selectedSectionName}
      productUpdatedAt={productUpdatedAt}
      cartItemRefs={cartItemRefs}
      onAddToCart={onAddToCart}
      onRemoveCartItems={onRemoveCartItems}
      isCartPreview={isCartPreview}
      onActiveCategoryChange={onActiveCategoryChange}
    />
  );
}
