import {
  formatFieldDisplayValue,
  hasRenderableValue,
} from '../model/card-design/cardFieldRenderModel';
import {
  buildFieldSlots,
  resolveSectionOrderFromLayoutPlan,
} from '../model/card-design/cardCompositionModel';
import {
  normalizeCardStyle,
  resolveFieldColorRoleValue,
} from '../model/card-design/cardStyleModel';
import {
  STOREFRONT_FIELD_LABELS,
  sortFieldKeysByDisplayOrder,
} from '../model/storefront-config/storefrontBuilderModel';
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
const CARD_RADIUS_PX_VALUES = { md: '14px', lg: '18px', xl: '24px' };
const CARD_SHADOW_VALUES = {
  none: 'none',
  soft: '0 10px 24px rgba(17, 24, 39, 0.07)',
  strong: '0 18px 36px rgba(17, 24, 39, 0.14)',
};
const INFO_PADDING_VALUES = {
  tight: '8px 12px 12px',
  normal: '10px 14px 14px',
  relaxed: '14px 18px 18px',
};
const INFO_FIELD_GAP_VALUES = { tight: '6px', normal: '8px', relaxed: '12px' };

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

function buildResolvedInfoSlots(visibleFields, bodySlots) {
  const allowedInfoFields = sortFieldKeysByDisplayOrder(
    visibleFields.filter(
      (field) => field !== 'img_url' && field !== 'product_name',
    ),
  );

  if (!Array.isArray(bodySlots) || bodySlots.length === 0) {
    return buildFieldSlots(allowedInfoFields, STOREFRONT_FIELD_LABELS);
  }

  const allowedFieldSet = new Set(allowedInfoFields);
  const includedFields = new Set();
  const nextSlots = [];

  bodySlots.forEach((slot) => {
    if (slot?.kind === 'field') {
      if (!allowedFieldSet.has(slot.field)) {
        return;
      }

      includedFields.add(slot.field);
      nextSlots.push(slot);
      return;
    }

    if (slot?.kind === 'inline-group' || slot?.kind === 'stack-group') {
      const filteredItems = (Array.isArray(slot.items) ? slot.items : []).filter(
        (item) => allowedFieldSet.has(item?.field),
      );

      if (filteredItems.length === 0) {
        return;
      }

      filteredItems.forEach((item) => {
        includedFields.add(item.field);
      });
      nextSlots.push({ ...slot, items: filteredItems });
    }
  });

  const missingFields = allowedInfoFields.filter(
    (field) => !includedFields.has(field),
  );

  if (missingFields.length === 0) {
    return nextSlots;
  }

  return [
    ...nextSlots,
    ...buildFieldSlots(missingFields, STOREFRONT_FIELD_LABELS),
  ];
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

function matchesConditionalStyleRule(product, rule) {
  const rawValue = product?.[rule.conditionField];
  const value = rawValue == null ? '' : String(rawValue).trim().toLowerCase();

  if (!value) {
    return false;
  }

  const target = rule.conditionValue.toLowerCase();

  return rule.conditionOperator === 'contains' ? value.includes(target) : value === target;
}

function mergeStyleSection(base, patch) {
  if (!patch) {
    return base;
  }

  const merged = { ...base };

  Object.keys(patch).forEach((key) => {
    const value = patch[key];

    if (value !== '' && value !== null && value !== undefined) {
      merged[key] = value;
    }
  });

  return merged;
}

function resolveActiveConditionalStyle(product, conditionalStyles) {
  const matchedRules = (Array.isArray(conditionalStyles) ? conditionalStyles : []).filter((rule) =>
    matchesConditionalStyleRule(product, rule),
  );

  if (matchedRules.length === 0) {
    return null;
  }

  return matchedRules.reduce(
    (merged, rule) => ({
      shell: mergeStyleSection(merged.shell, rule.shell),
      header: mergeStyleSection(merged.header, rule.header),
      image: mergeStyleSection(merged.image, rule.image),
      info: mergeStyleSection(merged.info, rule.info),
      field: mergeStyleSection(merged.field, rule.field),
    }),
    { shell: {}, header: {}, image: {}, info: {}, field: {} },
  );
}

function buildConditionalArticleStyle(activeStyle) {
  if (!activeStyle) {
    return undefined;
  }

  const style = {};
  const shellBg = resolveCssColor(activeStyle.shell.backgroundColor);
  const shellBorder = resolveCssColor(activeStyle.shell.borderColor);
  const headerBg = resolveCssColor(activeStyle.header.backgroundColor);
  const headerTitleColor = resolveCssColor(activeStyle.header.titleColorHex);
  const infoBg = resolveCssColor(activeStyle.info.backgroundColor);
  const infoBorder = resolveCssColor(activeStyle.info.borderColor);

  if (shellBg) style['--card-bg'] = shellBg;
  if (shellBorder) style['--card-border-color'] = shellBorder;
  if (activeStyle.shell.radius) style.borderRadius = CARD_RADIUS_PX_VALUES[activeStyle.shell.radius];
  if (activeStyle.shell.shadow) style.boxShadow = CARD_SHADOW_VALUES[activeStyle.shell.shadow];
  if (headerBg) style['--card-header-bg'] = headerBg;
  if (headerTitleColor) style['--card-header-title-color'] = headerTitleColor;
  if (activeStyle.header.letterSpacing) {
    style['--card-header-title-letter-spacing'] = activeStyle.header.letterSpacing;
  }
  if (Number.isFinite(activeStyle.header.fontWeight)) {
    style['--card-header-title-weight'] = activeStyle.header.fontWeight;
  }
  if (infoBg) style['--card-info-bg'] = infoBg;
  if (infoBorder) style['--card-info-border'] = infoBorder;
  if (activeStyle.field.priceColorRole) {
    style['--price-text-color'] = resolveFieldColorRoleValue(activeStyle.field.priceColorRole);
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

function buildConditionalInfoBodyStyle(activeStyle) {
  if (!activeStyle) {
    return undefined;
  }

  const style = {};

  if (activeStyle.info.padding) style.padding = INFO_PADDING_VALUES[activeStyle.info.padding];
  if (activeStyle.info.fieldGap) style.gap = INFO_FIELD_GAP_VALUES[activeStyle.info.fieldGap];

  return Object.keys(style).length > 0 ? style : undefined;
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

function renderImageSection(product, cardStyle, fitOverride) {
  return (
    <div className={styles.cardImageWrap} key="image">
      <img
        className={styles.cardImage}
        src={product.img_url}
        alt={product?.product_name || ''}
        style={{ objectFit: fitOverride || cardStyle.image.fit }}
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

function renderInfoSection(product, cardStyle, infoSlots, titleMode, bodyStyleOverride) {
  return (
    <div className={styles.cardBody} style={bodyStyleOverride} key="info">
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
  const infoSlots = buildResolvedInfoSlots(visibleFields, bodySlots);
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
          const activeConditionalStyle = resolveActiveConditionalStyle(
            product,
            resolvedStyle.conditionalStyles,
          );
          const articleStyle = buildConditionalArticleStyle(activeConditionalStyle);
          const infoBodyStyle = buildConditionalInfoBodyStyle(activeConditionalStyle);
          const sectionNodes = {
            header: sectionOrder.includes('header')
              ? renderHeaderSection(product, resolvedStyle)
              : null,
            image: hasImage
              ? renderImageSection(product, resolvedStyle, activeConditionalStyle?.image?.fit)
              : null,
            info: renderInfoSection(
              product,
              resolvedStyle,
              infoSlots,
              resolvedStyle.titleMode,
              infoBodyStyle,
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
                style={articleStyle}
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
              style={articleStyle}
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
