import { resolveFieldColorRoleValue } from '../card-design/style/cardStyleModel';
import { resolveCssColor } from './cardGridFieldStyleModel';

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

export function resolveActiveConditionalStyle(product, conditionalStyles) {
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

export function buildConditionalArticleStyle(activeStyle) {
  if (!activeStyle) {
    return undefined;
  }

  const style = {};
  const shellBg = resolveCssColor(activeStyle.shell.backgroundColor);
  const shellBorder = resolveCssColor(activeStyle.shell.borderColor);
  const headerBg = resolveCssColor(activeStyle.header.backgroundColor);
  const headerTitleColor = resolveCssColor(activeStyle.header.titleColorHex);
  const infoBg = resolveCssColor(activeStyle.info.backgroundColor);

  if (shellBg) style['--card-bg'] = shellBg;
  if (shellBorder) style['--card-border-color'] = shellBorder;
  if (activeStyle.shell.radius) style.borderRadius = CARD_RADIUS_PX_VALUES[activeStyle.shell.radius];
  if (activeStyle.shell.shadow) style.boxShadow = CARD_SHADOW_VALUES[activeStyle.shell.shadow];
  if (headerBg) style['--card-header-bg'] = headerBg;
  if (headerTitleColor) style['--card-header-title-color'] = headerTitleColor;
  if (Number.isFinite(activeStyle.header.fontWeight)) {
    style['--card-header-title-weight'] = activeStyle.header.fontWeight;
  }
  if (infoBg) style['--card-info-bg'] = infoBg;
  if (activeStyle.field.priceColorRole) {
    style['--price-text-color'] = resolveFieldColorRoleValue(activeStyle.field.priceColorRole);
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

export function buildConditionalInfoBodyStyle(activeStyle) {
  if (!activeStyle) {
    return undefined;
  }

  const style = {};

  if (activeStyle.info.padding) style.padding = INFO_PADDING_VALUES[activeStyle.info.padding];
  if (activeStyle.info.fieldGap) style.gap = INFO_FIELD_GAP_VALUES[activeStyle.info.fieldGap];

  return Object.keys(style).length > 0 ? style : undefined;
}
