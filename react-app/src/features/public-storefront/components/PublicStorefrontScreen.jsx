import StorefrontView from '../../storefront/components/StorefrontView';

export default function PublicStorefrontScreen({
  config,
  productRows,
  officeName = '',
  nhName = '',
}) {
  return (
    <StorefrontView
      config={config}
      productRows={productRows}
      officeName={officeName}
      nhName={nhName}
    />
  );
}
