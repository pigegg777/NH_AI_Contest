import {
  deriveLegacyCardLayoutPlan,
  DEFAULT_CARD_LAYOUT_PLAN,
  normalizeCardLayoutPlan,
} from './cardLayoutPlanModel';
import {
  normalizeCardsPerRow,
  normalizeTitleMode,
  resolveStructuralPreset,
} from './cardCompositionModel';
import { normalizeHexColor } from './pageStyleColor';

export const CARD_STYLE_SCHEMA_VERSION = 1;

export const CARD_FIELD_COLOR_ROLE_OPTIONS = ['inherit', 'brand', 'muted', 'blue', 'red', 'green', 'amber', 'ink'];
export const CARD_FIELD_FONT_WEIGHT_OPTIONS = ['normal', 'medium', 'semibold', 'bold'];
export const CARD_FIELD_FONT_SIZE_OPTIONS = ['small', 'medium', 'large'];
export const CARD_FIELD_EMPHASIS_OPTIONS = ['none', 'subtle', 'strong'];
export const CARD_SHADOW_OPTIONS = ['none', 'soft', 'strong'];
export const CARD_RADIUS_OPTIONS = ['md', 'lg', 'xl'];
export const CARD_SPACING_OPTIONS = ['tight', 'normal', 'relaxed'];
export const CARD_IMAGE_FIT_OPTIONS = ['cover', 'contain'];
export const CARD_INFO_ALIGNMENT_OPTIONS = ['start', 'center'];

export const DEFAULT_CARD_STYLE = {
  schemaVersion: CARD_STYLE_SCHEMA_VERSION,
  cardsPerRow: 2,
  structuralPreset: 'header-top',
  titleMode: 'header',
  layoutPlan: DEFAULT_CARD_LAYOUT_PLAN,
  shell: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    shadow: 'soft',
    radius: 'lg',
    spacing: 'relaxed',
  },
  header: {
    backgroundColor: '#f8fafc',
    borderColor: '',
    padding: 'normal',
    radius: 'lg',
    titleColorHex: '#111827',
    fontSize: 'medium',
    letterSpacing: 'normal',
    fontWeight: 700,
  },
  image: {
    fit: 'contain',
    sizePx: 120,
  },
  info: {
    backgroundColor: '',
    borderColor: '',
    padding: 'normal',
    radius: 'lg',
    fieldGap: 'normal',
    fieldGroupGap: 'normal',
    alignment: 'start',
  },
  field: {
    defaultColorRole: 'inherit',
    defaultFontWeight: 'normal',
    defaultFontSize: 'medium',
    priceColorRole: 'brand',
  },
};

const CARD_FIELD_COLOR_ROLE_VALUES = {
  inherit: 'inherit',
  brand: 'var(--brand-color, var(--corp-primary))',
  muted: '#6b7280',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#15803d',
  amber: '#d97706',
  ink: '#111827',
};

export function resolveFieldColorRoleValue(colorRole) {
  return CARD_FIELD_COLOR_ROLE_VALUES[colorRole] || CARD_FIELD_COLOR_ROLE_VALUES.inherit;
}

function normalizeOptionalHex(value) {
  return typeof value === 'string' && value ? normalizeHexColor(value, '') : '';
}

function normalizeShell(shell) {
  const source = shell ?? {};

  return {
    backgroundColor: normalizeHexColor(source.backgroundColor, DEFAULT_CARD_STYLE.shell.backgroundColor),
    borderColor: normalizeHexColor(source.borderColor, DEFAULT_CARD_STYLE.shell.borderColor),
    shadow: CARD_SHADOW_OPTIONS.includes(source.shadow) ? source.shadow : DEFAULT_CARD_STYLE.shell.shadow,
    radius: CARD_RADIUS_OPTIONS.includes(source.radius) ? source.radius : DEFAULT_CARD_STYLE.shell.radius,
    spacing: CARD_SPACING_OPTIONS.includes(source.spacing) ? source.spacing : DEFAULT_CARD_STYLE.shell.spacing,
  };
}

function normalizeHeader(header) {
  const source = header ?? {};
  const backgroundColor = normalizeHexColor(source.backgroundColor, DEFAULT_CARD_STYLE.header.backgroundColor);

  return {
    backgroundColor,
    borderColor: normalizeOptionalHex(source.borderColor),
    padding: CARD_SPACING_OPTIONS.includes(source.padding) ? source.padding : DEFAULT_CARD_STYLE.header.padding,
    radius: CARD_RADIUS_OPTIONS.includes(source.radius) ? source.radius : DEFAULT_CARD_STYLE.header.radius,
    titleColorHex: normalizeHexColor(source.titleColorHex, DEFAULT_CARD_STYLE.header.titleColorHex),
    fontSize: CARD_FIELD_FONT_SIZE_OPTIONS.includes(source.fontSize) ? source.fontSize : DEFAULT_CARD_STYLE.header.fontSize,
    letterSpacing: typeof source.letterSpacing === 'string' && source.letterSpacing ? source.letterSpacing : DEFAULT_CARD_STYLE.header.letterSpacing,
    fontWeight: Number.isFinite(source.fontWeight) ? source.fontWeight : DEFAULT_CARD_STYLE.header.fontWeight,
  };
}

function normalizeImage(image) {
  const source = image ?? {};
  const sizePx = Number(source.sizePx);

  return {
    fit: CARD_IMAGE_FIT_OPTIONS.includes(source.fit) ? source.fit : DEFAULT_CARD_STYLE.image.fit,
    sizePx: Number.isFinite(sizePx) && sizePx > 0 ? sizePx : DEFAULT_CARD_STYLE.image.sizePx,
  };
}

function normalizeInfo(info) {
  const source = info ?? {};

  return {
    backgroundColor: normalizeOptionalHex(source.backgroundColor),
    borderColor: normalizeOptionalHex(source.borderColor),
    padding: CARD_SPACING_OPTIONS.includes(source.padding) ? source.padding : DEFAULT_CARD_STYLE.info.padding,
    radius: CARD_RADIUS_OPTIONS.includes(source.radius) ? source.radius : DEFAULT_CARD_STYLE.info.radius,
    fieldGap: CARD_SPACING_OPTIONS.includes(source.fieldGap) ? source.fieldGap : DEFAULT_CARD_STYLE.info.fieldGap,
    fieldGroupGap: CARD_SPACING_OPTIONS.includes(source.fieldGroupGap) ? source.fieldGroupGap : DEFAULT_CARD_STYLE.info.fieldGroupGap,
    alignment: CARD_INFO_ALIGNMENT_OPTIONS.includes(source.alignment) ? source.alignment : DEFAULT_CARD_STYLE.info.alignment,
  };
}

function normalizeFieldDefaults(field) {
  const source = field ?? {};

  return {
    defaultColorRole: CARD_FIELD_COLOR_ROLE_OPTIONS.includes(source.defaultColorRole) ? source.defaultColorRole : DEFAULT_CARD_STYLE.field.defaultColorRole,
    defaultFontWeight: CARD_FIELD_FONT_WEIGHT_OPTIONS.includes(source.defaultFontWeight) ? source.defaultFontWeight : DEFAULT_CARD_STYLE.field.defaultFontWeight,
    defaultFontSize: CARD_FIELD_FONT_SIZE_OPTIONS.includes(source.defaultFontSize) ? source.defaultFontSize : DEFAULT_CARD_STYLE.field.defaultFontSize,
    priceColorRole: CARD_FIELD_COLOR_ROLE_OPTIONS.includes(source.priceColorRole) ? source.priceColorRole : DEFAULT_CARD_STYLE.field.priceColorRole,
  };
}

function buildDefaultLayoutPlanForCardsPerRow(cardsPerRow) {
  return {
    ...DEFAULT_CARD_LAYOUT_PLAN,
    cardsPerRow,
  };
}

function isDefaultLayoutPlanShape(layoutPlan, cardsPerRow) {
  if (!layoutPlan) {
    return false;
  }

  const normalizedLayoutPlan = normalizeCardLayoutPlan(
    { ...layoutPlan, cardsPerRow },
    buildDefaultLayoutPlanForCardsPerRow(cardsPerRow),
  );
  const defaultLayoutPlan = normalizeCardLayoutPlan(
    buildDefaultLayoutPlanForCardsPerRow(cardsPerRow),
  );

  return (
    normalizedLayoutPlan.sectionOrder.join('|') === defaultLayoutPlan.sectionOrder.join('|') &&
    normalizedLayoutPlan.imagePlacement === defaultLayoutPlan.imagePlacement &&
    normalizedLayoutPlan.titleClamp === defaultLayoutPlan.titleClamp &&
    normalizedLayoutPlan.contentDensity === defaultLayoutPlan.contentDensity &&
    normalizedLayoutPlan.emphasis === defaultLayoutPlan.emphasis &&
    normalizedLayoutPlan.groupingHint === defaultLayoutPlan.groupingHint
  );
}

export function normalizeCardStyle(style) {
  const source = style ?? {};
  const cardsPerRow = normalizeCardsPerRow(source.cardsPerRow, DEFAULT_CARD_STYLE.cardsPerRow);
  const structuralPreset = resolveStructuralPreset(source.structuralPreset, cardsPerRow);
  const titleMode = normalizeTitleMode(source.titleMode, DEFAULT_CARD_STYLE.titleMode);
  const shell = normalizeShell(source.shell);
  const legacyLayoutPlan = deriveLegacyCardLayoutPlan({
    cardsPerRow,
    structuralPreset,
    titleMode,
    info: source.info,
  });
  const layoutPlan = normalizeCardLayoutPlan(
    isDefaultLayoutPlanShape(source.layoutPlan, cardsPerRow)
      ? legacyLayoutPlan
      : { ...(source.layoutPlan ?? {}), cardsPerRow },
    legacyLayoutPlan,
  );

  return {
    schemaVersion: CARD_STYLE_SCHEMA_VERSION,
    cardsPerRow,
    structuralPreset,
    titleMode,
    layoutPlan,
    shell,
    header: normalizeHeader(source.header),
    image: normalizeImage(source.image),
    info: normalizeInfo(source.info),
    field: normalizeFieldDefaults(source.field),
  };
}
