import { CARD_STYLE_FONT_SIZE_REM, normalizeCardStyle, resolveCardPriceTextColor } from '../model/cardStyleModel';
import { STOREFRONT_FIELD_LABELS, sortFieldKeysByDisplayOrder } from '../model/storefrontBuilderModel';
import { deriveCardElementConfig } from '../model/storefrontUiModel';
import styles from './CardGridSection.module.css';

const PRICE_FIELD_SET = new Set(['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy']);
const NUTRIENT_FIELD_SET = new Set(['nutrient', 'product_nutirent']);
const FIELD_COLOR_ROLE_VALUES = {
  inherit: 'inherit',
  brand: 'var(--card-accent, var(--corp-primary))',
  muted: '#6b7280',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#15803d',
  amber: '#d97706',
  ink: '#111827',
};
const FIELD_FONT_WEIGHT_VALUES = {
  normal: '400',
  medium: '500',
  semibold: '700',
  bold: '800',
};
const FIELD_FONT_SIZE_VALUES = {
  small: 'calc(var(--card-font-size, 0.85rem) - 0.08rem)',
  medium: 'var(--card-font-size, 0.85rem)',
  large: 'calc(var(--card-font-size, 0.85rem) + 0.12rem)',
};
const REGION_SPACING_VALUES = {
  tight: '10px',
  compact: '10px',
  normal: '14px',
  default: '14px',
  relaxed: '18px',
  airy: '22px',
  large: '22px',
};
const REGION_RADIUS_VALUES = {
  none: '0',
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '24px',
  pill: '999px',
  rounded: '24px',
};
const CARD_REGION_RADIUS_VALUES = {
  sm: 'md',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  rounded: 'xl',
};
const CARD_REGION_SHADOW_VALUES = {
  none: 'none',
  soft: 'soft',
  default: 'soft',
  strong: 'strong',
};
const CARD_REGION_SPACING_VALUES = {
  tight: 'tight',
  compact: 'tight',
  normal: 'normal',
  default: 'normal',
  relaxed: 'relaxed',
  airy: 'relaxed',
};
const CARD_GRID_COLUMN_VALUES = new Set([1, 2, 3]);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

function resolveCssColor(value) {
  return HEX_COLOR_PATTERN.test(String(value || '')) ? value : '';
}

function resolveCardGridColumns(value, fallbackColumns) {
  const columns = Number(value);

  return CARD_GRID_COLUMN_VALUES.has(columns) ? columns : fallbackColumns;
}

function resolveSpacingValue(value) {
  return REGION_SPACING_VALUES[value] || '';
}

function resolveRadiusValue(value) {
  return REGION_RADIUS_VALUES[value] || '';
}

function resolveGridBorder(value) {
  if (value === 'none') {
    return '0';
  }

  if (value === 'strong') {
    return '1px solid rgba(17, 24, 39, 0.18)';
  }

  if (value === 'soft') {
    return '1px solid rgba(17, 24, 39, 0.08)';
  }

  return '';
}

function resolveCardRadius(value, fallbackRadius) {
  return CARD_REGION_RADIUS_VALUES[value] || fallbackRadius;
}

function resolveCardShadow(value, fallbackShadow) {
  return CARD_REGION_SHADOW_VALUES[value] || fallbackShadow;
}

function resolveCardSpacing(value, fallbackSpacing) {
  return CARD_REGION_SPACING_VALUES[value] || fallbackSpacing;
}

function buildFieldValueStyle(fieldStyle) {
  const valueStyle = {};
  const color = FIELD_COLOR_ROLE_VALUES[fieldStyle?.colorRole];
  const fontWeight = FIELD_FONT_WEIGHT_VALUES[fieldStyle?.fontWeight];
  const fontSize = FIELD_FONT_SIZE_VALUES[fieldStyle?.fontSize];

  if (color) {
    valueStyle['--field-text-color'] = color;
  }

  if (fontWeight) {
    valueStyle['--field-font-weight'] = fontWeight;
  }

  if (fontSize) {
    valueStyle['--field-font-size'] = fontSize;
  }

  if (fieldStyle?.emphasis === 'strong') {
    valueStyle['--field-letter-spacing'] = '-0.01em';
  }

  return Object.keys(valueStyle).length > 0 ? valueStyle : undefined;
}

function buildCardGridRegionVars(regionStyles) {
  const cardGrid = regionStyles?.cardGrid ?? {};
  const card = regionStyles?.card ?? {};
  const cssVars = {};
  const gridGap = resolveSpacingValue(cardGrid.gap);
  const gridBackground = resolveCssColor(cardGrid.backgroundColor);
  const gridBorder = resolveGridBorder(cardGrid.border);
  const gridRadius = resolveRadiusValue(cardGrid.radius);
  const gridPadding = resolveSpacingValue(cardGrid.padding);
  const cardBackground = resolveCssColor(card.backgroundColor);
  const cardBorder = resolveCssColor(card.borderColor);

  if (gridGap) {
    cssVars['--card-grid-gap'] = gridGap;
  }

  if (gridBackground) {
    cssVars['--card-grid-bg'] = gridBackground;
  }

  if (gridBorder) {
    cssVars['--card-grid-border'] = gridBorder;
  }

  if (gridRadius) {
    cssVars['--card-grid-radius'] = gridRadius;
  }

  if (gridPadding) {
    cssVars['--card-grid-padding'] = gridPadding;
  }

  if (cardBackground) {
    cssVars['--card-bg'] = cardBackground;
  }

  if (cardBorder) {
    cssVars['--card-border-color'] = cardBorder;
  }

  return cssVars;
}

function renderFieldValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return '';
  }

  if (PRICE_FIELD_SET.has(field)) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()}원` : '';
  }

  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return (
      <a href={value} className={styles.fieldValueLink} target="_blank" rel="noreferrer">
        View
      </a>
    );
  }

  return String(value);
}

function shouldShowField(field, elementConfig) {
  if (field === 'spec') {
    return elementConfig.showSpec;
  }

  if (NUTRIENT_FIELD_SET.has(field)) {
    return elementConfig.showNutrient;
  }

  if (PRICE_FIELD_SET.has(field)) {
    return elementConfig.showPrice;
  }

  return true;
}

function buildDefaultBodySlots(displayFields, cardTemplate, product, elementConfig) {
  const orderedFields = sortFieldKeysByDisplayOrder(
    displayFields
      .filter((field) => field !== 'img_url' && field !== 'product_name' && field !== 'medium_category')
      .filter((field) => shouldShowField(field, elementConfig))
      .filter((field) => {
        if (PRICE_FIELD_SET.has(field)) {
          return renderFieldValue(field, product?.[field]) !== '';
        }

        return true;
      }),
  );

  const sortedFields =
    cardTemplate === 'price-focus'
      ? [...orderedFields].sort((a, b) => Number(PRICE_FIELD_SET.has(b)) - Number(PRICE_FIELD_SET.has(a)))
      : orderedFields;

  return sortedFields.map((field) => ({
    id: field,
    kind: 'field',
    field,
    label: STOREFRONT_FIELD_LABELS[field] || field,
  }));
}

function filterVisibleSlotItems(items, product, elementConfig) {
  return (Array.isArray(items) ? items : []).filter((item) => {
    if (!item?.field || !shouldShowField(item.field, elementConfig)) {
      return false;
    }

    return renderFieldValue(item.field, product?.[item.field]) !== '';
  });
}

function renderFieldSlot(slot, product) {
  const label = slot.label || STOREFRONT_FIELD_LABELS[slot.field] || slot.field;
  const value = renderFieldValue(slot.field, product?.[slot.field]);
  const className = PRICE_FIELD_SET.has(slot.field) ? styles.priceField : styles.field;
  const valueStyle = buildFieldValueStyle(slot.style);

  return (
    <div key={slot.id} className={className}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue} style={valueStyle}>
        {value}
      </span>
    </div>
  );
}

function renderInlineGroupSlot(slot, product, elementConfig) {
  const visibleItems = filterVisibleSlotItems(slot.items, product, elementConfig);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div key={slot.id} className={styles.inlineGroup}>
      {slot.label ? <span className={styles.fieldLabel}>{slot.label}</span> : null}
      <div className={styles.inlineGroupItems}>
        {visibleItems.map((item) => (
          <div key={item.id} className={styles.inlineGroupItem}>
            <span className={styles.groupFieldLabel}>{item.label || STOREFRONT_FIELD_LABELS[item.field] || item.field}</span>
            <span
              className={`${styles.fieldValue} ${PRICE_FIELD_SET.has(item.field) ? styles.groupPriceValue : styles.groupFieldValue}`}
              style={buildFieldValueStyle(item.style)}
            >
              {renderFieldValue(item.field, product?.[item.field])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderStackGroupSlot(slot, product, elementConfig) {
  const visibleItems = filterVisibleSlotItems(slot.items, product, elementConfig);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div key={slot.id} className={styles.stackGroup}>
      {slot.label ? <span className={styles.fieldLabel}>{slot.label}</span> : null}
      <div className={styles.stackGroupItems}>
        {visibleItems.map((item) => (
          <div key={item.id} className={PRICE_FIELD_SET.has(item.field) ? styles.priceField : styles.field}>
            <span className={styles.groupFieldLabel}>{item.label || STOREFRONT_FIELD_LABELS[item.field] || item.field}</span>
            <span className={styles.fieldValue} style={buildFieldValueStyle(item.style)}>
              {renderFieldValue(item.field, product?.[item.field])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildRenderableBodySlots({ renderSpec, displayFields, cardTemplate, product, elementConfig, showHeaderTitle }) {
  const rawSlots =
    Array.isArray(renderSpec?.bodySlots) && renderSpec.bodySlots.length > 0
      ? renderSpec.bodySlots
      : buildDefaultBodySlots(displayFields, cardTemplate, product, elementConfig);

  return rawSlots.filter((slot) => {
    if (slot?.kind === 'field') {
      if (slot.field === 'product_name' && showHeaderTitle) {
        return false;
      }

      if (!shouldShowField(slot.field, elementConfig)) {
        return false;
      }

      return renderFieldValue(slot.field, product?.[slot.field]) !== '';
    }

    return filterVisibleSlotItems(slot?.items, product, elementConfig).length > 0;
  });
}

function renderBodySlot(slot, product, elementConfig) {
  if (slot.kind === 'inline-group') {
    return renderInlineGroupSlot(slot, product, elementConfig);
  }

  if (slot.kind === 'stack-group') {
    return renderStackGroupSlot(slot, product, elementConfig);
  }

  return renderFieldSlot(slot, product);
}

export default function CardGridSection({
  section,
  fields,
  style,
  sectionId,
  cardTemplate = 'card-grid',
  renderSpec = null,
  sectionHeaderContent = null,
}) {
  const products = Array.isArray(section?.products) ? section.products : [];
  const displayFields = Array.isArray(fields) && fields.length > 0 ? fields : ['product_name'];
  const elementConfig = deriveCardElementConfig(displayFields, style, section?.elementConfig);
  const resolvedStyle = normalizeCardStyle({
    ...(style ?? {}),
    imageSize: elementConfig.showImage ? elementConfig.imageSize : 'hidden',
    imageFit: elementConfig.imageFit,
  });
  const regionStyles = renderSpec?.regionStyles ?? {};
  const cardRegionStyles = regionStyles.card ?? {};
  const cardGridRegionStyles = regionStyles.cardGrid ?? {};
  const priceTextColor = resolveCardPriceTextColor(resolvedStyle.priceTextColor, resolvedStyle.accentColor);
  const cardColumns = resolveCardGridColumns(cardGridRegionStyles.columns, resolvedStyle.cardsPerRow);
  const cardRadius = resolveCardRadius(cardRegionStyles.radius, resolvedStyle.cardRadius);
  const cardShadow = resolveCardShadow(cardRegionStyles.shadow, resolvedStyle.cardShadow);
  const cardSpacing = resolveCardSpacing(cardRegionStyles.padding, resolvedStyle.cardSpacing);
  const cssVars = {
    '--card-accent': resolvedStyle.accentColor,
    '--card-font-size': CARD_STYLE_FONT_SIZE_REM[resolvedStyle.fontSize],
    '--card-columns': cardColumns,
    '--price-text-color': priceTextColor,
    ...buildCardGridRegionVars(regionStyles),
  };

  return (
    <section
      id={sectionId}
      className={styles.section}
      style={cssVars}
      data-image-size={resolvedStyle.imageSize}
      data-image-fit={resolvedStyle.imageFit}
      data-card-radius={cardRadius}
      data-card-shadow={cardShadow}
      data-card-spacing={cardSpacing}
      data-meta-density={elementConfig.metaDensity}
      data-card-template={cardTemplate}
    >
      {sectionHeaderContent ? <div className={styles.sectionHeaderContent}>{sectionHeaderContent}</div> : null}
      <div className={`${styles.grid} ${styles[`layout-${resolvedStyle.layout}`]}`}>
        {products.map((product, index) => {
          const showHeaderTitle = elementConfig.showProductName;
          const headerSlot = showHeaderTitle ? (
            <div className={styles.cardHeader} key="header">
              <strong className={styles.cardName} title={product?.product_name || '-'}>
                {product?.product_name || '-'}
              </strong>
            </div>
          ) : null;

          const imageSlot =
            product?.img_url && elementConfig.showImage && resolvedStyle.imageSize !== 'hidden' ? (
              <div className={styles.cardImageWrap} key="image">
                <img className={styles.cardImage} src={product.img_url} alt={product?.product_name || ''} />
              </div>
            ) : null;

          const bodySlots = buildRenderableBodySlots({
            renderSpec,
            displayFields,
            cardTemplate,
            product,
            elementConfig,
            showHeaderTitle,
          });

          const bodySlot = (
            <div className={styles.cardBody} key="body">
              {bodySlots.map((slot) => renderBodySlot(slot, product, elementConfig))}
            </div>
          );

          const cardKey = product?.row_id || product?.product_code || `${product?.product_name ?? 'product'}-${product?.spec ?? index}`;

          if (cardTemplate === 'image-left') {
            return (
              <article key={cardKey} className={`${styles.card} ${styles.cardImageLeft}`}>
                {imageSlot}
                <div className={styles.cardMain}>
                  {headerSlot}
                  {bodySlot}
                </div>
              </article>
            );
          }

          if (cardTemplate === 'compact-list') {
            return (
              <article key={cardKey} className={styles.card}>
                {headerSlot}
                {bodySlot}
              </article>
            );
          }

          if (cardTemplate === 'detail-first') {
            return (
              <article key={cardKey} className={styles.card}>
                {bodySlot}
                {headerSlot}
                {imageSlot}
              </article>
            );
          }

          return (
            <article key={cardKey} className={styles.card}>
              {headerSlot}
              {imageSlot}
              {bodySlot}
            </article>
          );
        })}
      </div>
    </section>
  );
}
