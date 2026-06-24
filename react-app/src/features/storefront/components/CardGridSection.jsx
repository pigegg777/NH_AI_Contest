import {
  formatFieldDisplayValue,
  hasRenderableValue,
} from '../model/cardFieldRenderModel';
import {
  buildFieldSlots,
  resolveSectionOrderFromLayoutPlan,
} from '../model/cardCompositionModel';
import {
  normalizeCardStyle,
  resolveFieldColorRoleValue,
} from '../model/cardStyleModel';
import {
  STOREFRONT_FIELD_LABELS,
  sortFieldKeysByDisplayOrder,
} from '../model/storefrontBuilderModel';
import styles from './CardGridSection.module.css';

const PRICE_FIELD_SET = new Set([
  'zero_tax_price',
  'tax_price',
  'exempt_tax_price',
  'price_subsidy',
]);
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
const CARD_BASE_FONT_SIZE_REM = {
  small: '0.75rem',
  medium: '0.85rem',
  large: '1rem',
};
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;

function buildLineClampStyle(lines = 2) {
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

function resolveCssColor(value) {
  return HEX_COLOR_PATTERN.test(String(value || '')) ? value : '';
}

function isUrlValue(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('http://') || value.startsWith('https://'))
  );
}

function renderFieldSlotValue(field, value) {
  if (isUrlValue(value)) {
    return (
      <a
        href={value}
        className={styles.fieldValueLink}
        target="_blank"
        rel="noreferrer"
      >
        View
      </a>
    );
  }

  return formatFieldDisplayValue(field, value);
}

function buildFieldValueStyle(fieldStyle) {
  if (!fieldStyle) {
    return undefined;
  }

  const valueStyle = {};
  const fontWeight = FIELD_FONT_WEIGHT_VALUES[fieldStyle.fontWeight];
  const fontSize = FIELD_FONT_SIZE_VALUES[fieldStyle.fontSize];

  if (fieldStyle.colorRole) {
    valueStyle['--field-text-color'] = resolveFieldColorRoleValue(
      fieldStyle.colorRole,
    );
  }

  if (fontWeight) {
    valueStyle['--field-font-weight'] = fontWeight;
  }

  if (fontSize) {
    valueStyle['--field-font-size'] = fontSize;
  }

  if (fieldStyle.emphasis === 'strong') {
    valueStyle['--field-letter-spacing'] = '-0.01em';
  }

  return Object.keys(valueStyle).length > 0 ? valueStyle : undefined;
}

function buildDefaultInfoSlots(visibleFields) {
  const orderedFields = sortFieldKeysByDisplayOrder(
    visibleFields.filter(
      (field) => field !== 'img_url' && field !== 'product_name',
    ),
  );

  return buildFieldSlots(orderedFields, STOREFRONT_FIELD_LABELS);
}

function filterVisibleSlotItems(items, product) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => item?.field && hasRenderableValue(product?.[item.field]),
  );
}

function renderFieldSlot(slot, product) {
  const label = slot.label || STOREFRONT_FIELD_LABELS[slot.field] || slot.field;
  const className = PRICE_FIELD_SET.has(slot.field)
    ? styles.priceField
    : styles.field;

  return (
    <div key={slot.id} className={className}>
      <span className={styles.fieldLabel}>{label}</span>
      <span
        className={styles.fieldValue}
        style={buildFieldValueStyle(slot.style)}
      >
        {renderFieldSlotValue(slot.field, product?.[slot.field])}
      </span>
    </div>
  );
}

function renderInlineGroupSlot(slot, product) {
  const visibleItems = filterVisibleSlotItems(slot.items, product);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div key={slot.id} className={styles.inlineGroup}>
      {slot.label ? (
        <span className={styles.fieldLabel}>{slot.label}</span>
      ) : null}
      <div className={styles.inlineGroupItems}>
        {visibleItems.map((item) => (
          <div key={item.id} className={styles.inlineGroupItem}>
            <span className={styles.groupFieldLabel}>
              {item.label || STOREFRONT_FIELD_LABELS[item.field] || item.field}
            </span>
            <span
              className={`${styles.fieldValue} ${
                PRICE_FIELD_SET.has(item.field)
                  ? styles.groupPriceValue
                  : styles.groupFieldValue
              }`}
              style={buildFieldValueStyle(item.style)}
            >
              {renderFieldSlotValue(item.field, product?.[item.field])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderStackGroupSlot(slot, product) {
  const visibleItems = filterVisibleSlotItems(slot.items, product);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div key={slot.id} className={styles.stackGroup}>
      {slot.label ? (
        <span className={styles.fieldLabel}>{slot.label}</span>
      ) : null}
      <div className={styles.stackGroupItems}>
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className={
              PRICE_FIELD_SET.has(item.field) ? styles.priceField : styles.field
            }
          >
            <span className={styles.groupFieldLabel}>
              {item.label || STOREFRONT_FIELD_LABELS[item.field] || item.field}
            </span>
            <span
              className={styles.fieldValue}
              style={buildFieldValueStyle(item.style)}
            >
              {renderFieldSlotValue(item.field, product?.[item.field])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderInfoSlot(slot, product) {
  if (slot.kind === 'inline-group') {
    return renderInlineGroupSlot(slot, product);
  }

  if (slot.kind === 'stack-group') {
    return renderStackGroupSlot(slot, product);
  }

  if (!hasRenderableValue(product?.[slot.field])) {
    return null;
  }

  return renderFieldSlot(slot, product);
}

function buildShellCssVars(cardStyle) {
  const cssVars = {
    '--card-font-size':
      CARD_BASE_FONT_SIZE_REM[cardStyle.field.defaultFontSize],
    '--card-header-bg': resolveCssColor(cardStyle.header.backgroundColor),
    '--card-header-title-color': resolveCssColor(
      cardStyle.header.titleColorHex,
    ),
    '--card-header-title-weight': cardStyle.header.fontWeight,
    '--card-header-title-letter-spacing': cardStyle.header.letterSpacing,
    '--card-image-size': `${cardStyle.image.sizePx}px`,
    '--info-field-group-gap':
      cardStyle.info.fieldGroupGap === 'tight'
        ? '6px'
        : cardStyle.info.fieldGroupGap === 'relaxed'
          ? '14px'
          : '10px',
    '--price-text-color': resolveFieldColorRoleValue(
      cardStyle.field.priceColorRole,
    ),
    '--field-default-color': resolveFieldColorRoleValue(
      cardStyle.field.defaultColorRole,
    ),
  };
  const shellBackground = resolveCssColor(cardStyle.shell.backgroundColor);
  const shellBorder = resolveCssColor(cardStyle.shell.borderColor);
  const infoBackground = resolveCssColor(cardStyle.info.backgroundColor);
  const infoBorder = resolveCssColor(cardStyle.info.borderColor);
  const headerBorder = resolveCssColor(cardStyle.header.borderColor);
  const isSideImage =
    cardStyle.layoutPlan.imagePlacement === 'left' ||
    cardStyle.layoutPlan.imagePlacement === 'right';

  if (shellBackground) cssVars['--card-bg'] = shellBackground;
  if (shellBorder) cssVars['--card-border-color'] = shellBorder;
  if (infoBackground) cssVars['--card-info-bg'] = infoBackground;
  if (infoBorder) cssVars['--card-info-border'] = infoBorder;
  if (headerBorder) cssVars['--card-header-border'] = headerBorder;

  if (isSideImage) {
    cssVars['--card-image-width'] = `${cardStyle.image.sizePx}px`;
  } else {
    cssVars['--card-image-height'] = `${cardStyle.image.sizePx}px`;
  }

  return cssVars;
}

function renderHeaderSection(product, cardStyle) {
  return (
    <div className={styles.cardHeader} key="header">
      <strong
        className={styles.cardName}
        style={buildLineClampStyle(cardStyle.layoutPlan.titleClamp)}
        title={product?.product_name || '-'}
      >
        {product?.product_name || '-'}
      </strong>
    </div>
  );
}

function renderImageSection(product, cardStyle) {
  return (
    <div className={styles.cardImageWrap} key="image">
      <img
        className={styles.cardImage}
        src={product.img_url}
        alt={product?.product_name || ''}
        style={{ objectFit: cardStyle.image.fit }}
      />
    </div>
  );
}

function renderInlineTitleSlot(product, cardStyle) {
  return (
    <div className={styles.field} key="inline-title">
      <span
        className={styles.fieldValue}
        style={buildLineClampStyle(cardStyle.layoutPlan.titleClamp)}
      >
        {product?.product_name || '-'}
      </span>
    </div>
  );
}

function renderInfoSection(product, cardStyle, infoSlots, titleMode) {
  return (
    <div className={styles.cardBody} key="info">
      {titleMode === 'inline'
        ? renderInlineTitleSlot(product, cardStyle)
        : null}
      {infoSlots.map((slot) => renderInfoSlot(slot, product))}
    </div>
  );
}

export default function CardGridSection({
  section,
  fields,
  cardStyle,
  bodySlots = [],
  sectionId,
  sectionHeaderContent = null,
}) {
  const products = Array.isArray(section?.products) ? section.products : [];
  const visibleFields =
    Array.isArray(fields) && fields.length > 0 ? fields : ['product_name'];
  const resolvedStyle = normalizeCardStyle(cardStyle);
  const sectionOrder = resolveSectionOrderFromLayoutPlan(
    resolvedStyle.layoutPlan,
    resolvedStyle.titleMode,
  );
  const infoSlots =
    Array.isArray(bodySlots) && bodySlots.length > 0
      ? bodySlots
      : buildDefaultInfoSlots(visibleFields);
  const cssVars = {
    '--card-columns': resolvedStyle.cardsPerRow,
    ...buildShellCssVars(resolvedStyle),
  };

  return (
    <section
      id={sectionId}
      className={styles.section}
      style={cssVars}
      data-testid="storefront-card-grid-section"
      data-structural-preset={resolvedStyle.structuralPreset}
      data-title-mode={resolvedStyle.titleMode}
      data-card-radius={resolvedStyle.shell.radius}
      data-card-shadow={resolvedStyle.shell.shadow}
      data-card-spacing={resolvedStyle.shell.spacing}
      data-header-padding={resolvedStyle.header.padding}
      data-info-padding={resolvedStyle.info.padding}
      data-info-gap={resolvedStyle.info.fieldGap}
      data-content-density={resolvedStyle.layoutPlan.contentDensity}
      data-layout-emphasis={resolvedStyle.layoutPlan.emphasis}
    >
      {sectionHeaderContent ? (
        <div className={styles.sectionHeaderContent}>
          {sectionHeaderContent}
        </div>
      ) : null}
      <div className={styles.grid}>
        {products.map((product, index) => {
          const cardKey =
            product?.row_id ||
            product?.product_code ||
            `${product?.product_name ?? 'product'}-${product?.spec ?? index}`;
          const hasImage =
            visibleFields.includes('img_url') &&
            Boolean(product?.img_url) &&
            sectionOrder.includes('image');
          const isSideImage =
            hasImage &&
            (resolvedStyle.layoutPlan.imagePlacement === 'left' ||
              resolvedStyle.layoutPlan.imagePlacement === 'right');
          const sectionNodes = {
            header: sectionOrder.includes('header')
              ? renderHeaderSection(product, resolvedStyle)
              : null,
            image: hasImage ? renderImageSection(product, resolvedStyle) : null,
            info: renderInfoSection(
              product,
              resolvedStyle,
              infoSlots,
              resolvedStyle.titleMode,
            ),
          };

          if (isSideImage) {
            const mainSectionOrder = sectionOrder.filter(
              (sectionName) => sectionName !== 'image',
            );

            return (
              <article
                key={cardKey}
                className={`${styles.card} ${styles.cardSideBySide} ${
                  resolvedStyle.layoutPlan.imagePlacement === 'right'
                    ? styles.cardImageRight
                    : styles.cardImageLeft
                }`}
                data-image-placement={resolvedStyle.layoutPlan.imagePlacement}
              >
                {resolvedStyle.layoutPlan.imagePlacement === 'left'
                  ? sectionNodes.image
                  : null}
                <div className={styles.cardMain}>
                  {mainSectionOrder.map(
                    (sectionName) => sectionNodes[sectionName],
                  )}
                </div>
                {resolvedStyle.layoutPlan.imagePlacement === 'right'
                  ? sectionNodes.image
                  : null}
              </article>
            );
          }

          return (
            <article
              key={cardKey}
              className={styles.card}
              data-image-placement={resolvedStyle.layoutPlan.imagePlacement}
            >
              {sectionOrder.map((sectionName) => sectionNodes[sectionName])}
            </article>
          );
        })}
      </div>
    </section>
  );
}
