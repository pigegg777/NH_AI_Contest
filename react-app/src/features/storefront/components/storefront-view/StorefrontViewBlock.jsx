import { MOBILE_UI_HELPER_TYPES } from '../../model/storefront-config/storefrontUiModel';
import HelperBlock from './HelperBlock';
import HeroBlock from './HeroBlock';
import ProductCategoryNavBlock from './ProductCategoryNavBlock';
import MobileCategoryBarBlock from './MobileCategoryBarBlock';
import SearchBoxBlock from './SearchBoxBlock';
import CategoryChipsBlock from './CategoryChipsBlock';

export default function StorefrontViewBlock({ block, view, brandLogoSrc, elementKey }) {
  if (!block || block.enabled === false) {
    return null;
  }

  if (MOBILE_UI_HELPER_TYPES.includes(block.type)) {
    return <HelperBlock block={block} />;
  }

  switch (block.type) {
    case 'hero':
      return <HeroBlock view={view} brandLogoSrc={brandLogoSrc} />;
    case 'productCategoryNav':
      return <ProductCategoryNavBlock view={view} elementKey={elementKey} />;
    case 'mobileCategoryBar':
      return <MobileCategoryBarBlock view={view} elementKey={elementKey} />;
    case 'searchBox':
      return <SearchBoxBlock view={view} />;
    case 'categoryChips':
      return <CategoryChipsBlock view={view} elementKey={elementKey} />;
    default:
      return null;
  }
}
