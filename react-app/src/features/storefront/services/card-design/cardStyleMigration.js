import { normalizeCardStyle } from '../../model/card-design/cardStyleModel';

const LEGACY_TEMPLATE_TO_STRUCTURAL_PRESET = {
  'card-grid': 'header-top',
  'price-focus': 'header-top',
  'image-left': 'image-left',
  'compact-list': 'compact-list',
  'detail-first': 'detail-first',
};

const LEGACY_PRICE_TEXT_COLOR_TO_FIELD_COLOR_ROLE = {
  default: 'red',
  muted: 'muted',
  brand: 'brand',
};

const LEGACY_IMAGE_SIZE_TO_PX = {
  hidden: 96,
  sm: 96,
  md: 140,
  lg: 200,
};

export function categoryConfigNeedsCardStyleMigration(categoryConfig) {
  const cardDesign = categoryConfig?.cardDesign;

  return Boolean(cardDesign) && !cardDesign.cardStyle && Boolean(cardDesign.style || cardDesign.elementConfig);
}

export function migrateLegacyCategoryConfigToCardStyle(categoryConfig) {
  const legacyStyle = categoryConfig?.cardDesign?.style ?? {};
  const legacyElementConfig = categoryConfig?.cardDesign?.elementConfig ?? {};
  const isCompactDensity = legacyStyle.layout === 'compact' || legacyElementConfig.metaDensity === 'compact';
  const spacingToken = isCompactDensity ? 'tight' : 'normal';

  return normalizeCardStyle({
    cardsPerRow: legacyStyle.cardsPerRow,
    structuralPreset: LEGACY_TEMPLATE_TO_STRUCTURAL_PRESET[categoryConfig?.layoutStyle?.variant] || 'header-top',
    titleMode: 'header',
    shell: {
      radius: legacyStyle.cardRadius,
      shadow: legacyStyle.cardShadow,
      spacing: legacyStyle.cardSpacing,
    },
    image: {
      fit: legacyStyle.imageFit,
      sizePx: LEGACY_IMAGE_SIZE_TO_PX[legacyStyle.imageSize],
    },
    info: {
      padding: spacingToken,
      fieldGap: spacingToken,
    },
    field: {
      defaultFontSize: legacyStyle.fontSize,
      priceColorRole: LEGACY_PRICE_TEXT_COLOR_TO_FIELD_COLOR_ROLE[legacyStyle.priceTextColor] || 'red',
    },
  });
}
