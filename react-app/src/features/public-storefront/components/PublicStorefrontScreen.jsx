import StorefrontView from '../../storefront/components/storefront-page/StorefrontView';

export default function PublicStorefrontScreen({
  config,
  productRows,
  officeName = '',
  nhName = '',
  selectedSectionName = '',
  productUpdatedAt = '',
}) {
  return (
    <StorefrontView
      config={config}
      productRows={productRows}
      officeName={officeName}
      nhName={nhName}
      selectedSectionName={selectedSectionName}
      productUpdatedAt={productUpdatedAt}
    />
  );
}
