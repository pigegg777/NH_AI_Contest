import { PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES, PAGE_STYLE_SEARCH_SIZE_VALUES } from '../model/pageStyleModel';
import { MOBILE_UI_HELPER_TYPES } from '../model/storefrontUiModel';
import { useStorefrontView } from '../hooks/useStorefrontView';
import CardGridSection from './CardGridSection';
import DesktopCategoryRail from './storefront-view/DesktopCategoryRail';
import HelperBlock from './storefront-view/HelperBlock';
import styles from './StorefrontView.module.css';

const SEARCH_VARIANT_CLASS_NAMES = {
  pill: styles.searchBoxPill,
  outlined: styles.searchBoxOutlined,
  soft: styles.searchBoxSoft,
};

const CHIP_VARIANT_CLASS_NAMES = {
  filled: styles.categoryWrapFilled,
  outline: styles.categoryWrapOutline,
  soft: styles.categoryWrapSoft,
};

const HEADER_SLOT_ORDER = ['top', 'afterSearch', 'beforeChips', 'afterChips'];
const BODY_SLOT_ORDER = ['beforeProducts', 'bottom'];
const HEX_COLOR_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
const REGION_COLOR_ROLE_VALUES = {
  brand: 'var(--brand-color, var(--corp-primary))',
  muted: '#6b7280',
  blue: '#2563eb',
  red: '#dc2626',
  green: '#15803d',
  amber: '#d97706',
  ink: '#111827',
};
const REGION_SPACING_VALUES = {
  tight: '14px',
  compact: '14px',
  normal: '20px',
  default: '20px',
  relaxed: '28px',
  airy: '32px',
};
const REGION_SIZE_VALUES = {
  compact: { minHeight: '34px', fontSize: '0.82rem' },
  small: { minHeight: '34px', fontSize: '0.82rem' },
  default: { minHeight: '40px', fontSize: '0.94rem' },
  medium: { minHeight: '40px', fontSize: '0.94rem' },
  large: { minHeight: '48px', fontSize: '1rem' },
};
const REGION_RADIUS_VALUES = {
  sm: '10px',
  md: '14px',
  lg: '18px',
  xl: '24px',
  pill: '999px',
  rounded: '24px',
};
const PAGE_WIDTH_VALUES = {
  narrow: '860px',
  default: '1120px',
  wide: '1320px',
  full: 'none',
};

function resolveCssColor(value) {
  return HEX_COLOR_PATTERN.test(String(value || '')) ? value : '';
}

function resolveColorRole(value) {
  return REGION_COLOR_ROLE_VALUES[value] || '';
}

function resolveSpacing(value) {
  return REGION_SPACING_VALUES[value] || '';
}

function resolveRadius(value) {
  return REGION_RADIUS_VALUES[value] || '';
}

function buildStorefrontRegionStyleVars(regionStyles) {
  const page = regionStyles?.page ?? {};
  const search = regionStyles?.search ?? {};
  const category = regionStyles?.category ?? {};
  const cssVars = {};
  const pageBackground = resolveCssColor(page.backgroundColor);
  const pageGap = resolveSpacing(page.sectionGap);
  const pageTopSpacing = resolveSpacing(page.topSpacing);
  const pageWidth = PAGE_WIDTH_VALUES[page.width];
  const searchColor = resolveColorRole(search.colorRole);
  const searchSize = REGION_SIZE_VALUES[search.size];
  const searchRadius = resolveRadius(search.radius);
  const searchBorderColor =
    resolveColorRole(search.border) || resolveCssColor(search.border);
  const categoryColor = resolveColorRole(category.colorRole);
  const categoryGap = resolveSpacing(category.gap);
  const categoryRadius = resolveRadius(category.radius);
  const categorySize = REGION_SIZE_VALUES[category.size];

  if (pageBackground) {
    cssVars['--page-bg'] = pageBackground;
  }

  if (pageGap) {
    cssVars['--page-section-gap'] = pageGap;
  }

  if (pageTopSpacing) {
    cssVars['--page-top-spacing'] = pageTopSpacing;
  }

  if (pageWidth) {
    cssVars['--page-content-max-width'] = pageWidth;
  }

  if (searchColor) {
    cssVars['--search-accent'] = searchColor;
  }

  if (searchSize) {
    cssVars['--search-min-height'] = searchSize.minHeight;
    cssVars['--search-font-size'] = searchSize.fontSize;
  }

  if (searchRadius) {
    cssVars['--search-radius'] = searchRadius;
  }

  if (searchBorderColor) {
    cssVars['--search-border-color'] = searchBorderColor;
  }

  if (categoryColor) {
    cssVars['--category-chip-accent'] = categoryColor;
  }

  if (categoryGap) {
    cssVars['--category-chip-gap'] = categoryGap;
  }

  if (categoryRadius) {
    cssVars['--category-chip-radius'] = categoryRadius;
  }

  if (categorySize) {
    cssVars['--category-chip-height'] = categorySize.minHeight;
    cssVars['--category-chip-font-size'] = categorySize.fontSize;
  }

  return cssVars;
}

export default function StorefrontView({ config, productRows }) {
  const view = useStorefrontView({ config, productRows });
  const regionStyles = view.activeRegionStyles ?? {};
  const searchPlaceholder =
    regionStyles.search?.placeholder || view.searchPlaceholder;

  function renderBlock(block, keyPrefix = '') {
    if (!block || block.enabled === false) {
      return null;
    }

    const elementKey = keyPrefix ? `${keyPrefix}-${block.id}` : block.id;

    if (MOBILE_UI_HELPER_TYPES.includes(block.type)) {
      return <HelperBlock key={elementKey} block={block} />;
    }

    switch (block.type) {
      case 'hero':
        return (
          <div key={elementKey} className={styles.heroTop}>
            <div className={styles.brandBlock}>
              {config?.navConfig?.logoUrl ? (
                <img
                  className={styles.logo}
                  src={config.navConfig.logoUrl}
                  alt="로고"
                />
              ) : null}
              <div>
                <h1 className={styles.title}>
                  {view.activeSectionTitle || view.title}
                </h1>
              </div>
            </div>
          </div>
        );
      case 'productCategoryNav':
        return null;
      case 'mobileCategoryBar':
        if (!view.activeSectionTitle) {
          return null;
        }

        return (
          <div
            key={elementKey}
            className={styles.mobileCategoryBar}
            data-testid="storefront-mobile-category-bar"
          >
            <strong className={styles.mobileCategoryTitle}>
              {view.activeSectionTitle}
            </strong>
            {view.activeSectionMediumCategories.length > 0 ? (
              <div className={styles.mobileCategoryMeta}>
                {view.activeSectionMediumCategories.map((item) => (
                  <span
                    key={`${elementKey}-${item}`}
                    className={styles.mobileCategoryMetaItem}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      case 'searchBox':
        return (
          <div key={elementKey} className={styles.searchRow}>
            <label
              className={`${styles.searchBox} ${SEARCH_VARIANT_CLASS_NAMES[view.searchVariant] || ''}`}
              data-testid="storefront-search"
              data-search-variant={view.searchVariant}
            >
              <input
                type="search"
                className={styles.searchInput}
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={view.searchText}
                onChange={(event) => view.setSearchText(event.target.value)}
              />
              <span className={styles.searchIcon} aria-hidden="true" />
            </label>
          </div>
        );
      case 'categoryChips': {
        if (view.mediumCategoryItems.length <= 1) {
          return null;
        }

        return (
          <div key={elementKey} className={styles.categoryChipsSection}>
            <div
              className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[view.categoryChipVariant] || ''}`}
              data-testid="storefront-category-chips"
              data-chip-variant={view.categoryChipVariant}
              data-category-layout={
                regionStyles.category?.layout || 'single-row-scroll'
              }
              data-chip-size="compact"
            >
              {view.mediumCategoryItems.map((item) => (
                <button
                  key={`${elementKey}-${item}`}
                  type="button"
                  className={`${styles.categoryChip} ${view.activeMediumCategory === item ? styles.categoryChipActive : ''}`}
                  onClick={() => view.handleMediumCategorySelect(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  }

  function renderSlot(slot) {
    return view.mobileUiTree
      .filter(
        (block) =>
          block.slot === slot &&
          block.type !== 'productSections' &&
          block.type !== 'emptyState',
      )
      .map((block) => renderBlock(block, slot));
  }

  return (
    <div
      className={styles.page}
      data-testid="storefront-page"
      style={{
        '--brand-color': view.brandColor,
        '--chip-accent': view.chipAccentColor,
        '--title-text-color': view.titleTextColorValue,
        '--typography-heading-weight': view.typographyToneValue.headingWeight,
        '--typography-body-weight': view.typographyToneValue.bodyWeight,
        '--typography-letter-spacing': view.typographyToneValue.letterSpacing,
        '--page-bg': view.pageStyle.palette.backgroundHex,
        '--page-search-min-height': PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].minHeight,
        '--page-search-font-size': PAGE_STYLE_SEARCH_SIZE_VALUES[view.pageStyle.search.sizeToken].fontSize,
        '--page-search-border-width': PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES[view.pageStyle.search.borderStrengthToken],
        '--page-search-border-color': view.pageStyle.search.borderColorHex,
        '--page-search-focus-border-color': view.pageStyle.search.focusBorderColorHex,
        '--page-chip-bg': view.pageStyle.categoryChips.backgroundHex,
        '--page-chip-text': view.pageStyle.categoryChips.textHex,
        '--page-chip-border': view.pageStyle.categoryChips.borderColorHex,
        '--page-chip-active-bg': view.pageStyle.categoryChips.activeBackgroundHex,
        '--page-chip-active-text': view.pageStyle.categoryChips.activeTextHex,
        ...buildStorefrontRegionStyleVars(regionStyles),
      }}
    >
      <header className={styles.hero}>
        {HEADER_SLOT_ORDER.map((slot) => renderSlot(slot))}
      </header>

      <div
        className={`${styles.bodyShell} ${!view.canRenderDesktopCategoryRail ? styles.bodyShellSolo : ''}`}
      >
        {view.canRenderDesktopCategoryRail ? (
          <DesktopCategoryRail
            catalogSectionEntries={view.catalogSectionEntries}
            activeSectionTitle={view.activeSectionTitle}
            title={view.title}
            isOpen={view.isDesktopCategoryNavOpen}
            onToggle={() =>
              view.setIsDesktopCategoryNavOpen((current) => !current)
            }
            activeMediumCategory={view.activeMediumCategory}
            onSectionSelect={view.handleCategoryRailSectionSelect}
            onMediumSelect={view.handleCategoryRailMediumSelect}
          />
        ) : null}

        <div className={styles.contentColumn}>
          {BODY_SLOT_ORDER.map((slot) => {
            if (slot === 'bottom') {
              return null;
            }

            return renderSlot(slot);
          })}

          {view.hasRenderableSections
            ? view.sectionEntries.map(({ section, sectionId }) => (
                <CardGridSection
                  key={sectionId}
                  sectionId={sectionId}
                  section={section}
                  fields={section?.fields}
                  style={section?.style}
                  cardTemplate={section?.cardTemplate}
                  renderSpec={section?.renderSpec}
                  sectionHeaderContent={view.sectionHeaderBlocks.map(
                    (block) => (
                      <HelperBlock
                        key={`${sectionId}-${block.id}`}
                        block={block}
                      />
                    ),
                  )}
                />
              ))
            : null}

          {view.canRenderEmptyState ? (
            <div className={styles.emptyState}>
              표시할 상품이 없습니다. 검색어와 중분류를 다시 확인해 주세요.
            </div>
          ) : null}

          {renderSlot('bottom')}
        </div>
      </div>
    </div>
  );
}
