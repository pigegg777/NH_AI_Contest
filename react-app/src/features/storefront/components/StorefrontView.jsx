import { PAGE_STYLE_SEARCH_BORDER_WIDTH_VALUES, PAGE_STYLE_SEARCH_SIZE_VALUES } from '../model/pageStyleModel';
import { getDefaultBlock, MOBILE_UI_HELPER_TYPES } from '../model/storefrontUiModel';
import { useStorefrontView } from '../hooks/useStorefrontView';
import nhCyberSymbolUrl from '../assets/nh_cyber_symbol.png';
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
const TOP_SLOT_BLOCK_ORDER = {
  hero: 0,
  searchBox: 1,
  productCategoryNav: 2,
  mobileCategoryBar: 3,
};

const HEADER_SLOT_ORDER = ['top', 'afterSearch', 'beforeChips', 'afterChips'];
const BODY_SLOT_ORDER = ['beforeProducts', 'bottom'];

function buildRenderableMobileUiTree(mobileUiTree, shouldInferProductCategoryNav) {
  if (!shouldInferProductCategoryNav) {
    return mobileUiTree;
  }

  const hasProductCategoryNav = mobileUiTree.some(
    (block) => block?.type === 'productCategoryNav' && block.enabled !== false,
  );

  if (hasProductCategoryNav) {
    return mobileUiTree;
  }

  const inferredProductCategoryNav = {
    ...getDefaultBlock('productCategoryNav'),
    id: 'inferred-product-category-nav',
  };
  const nextTree = [];
  let inserted = false;

  mobileUiTree.forEach((block) => {
    nextTree.push(block);

    if (!inserted && block?.type === 'hero') {
      nextTree.push(inferredProductCategoryNav);
      inserted = true;
    }
  });

  if (!inserted) {
    const firstTopBlockIndex = nextTree.findIndex((block) => block?.slot === 'top');

    if (firstTopBlockIndex === -1) {
      nextTree.unshift(inferredProductCategoryNav);
    } else {
      nextTree.splice(firstTopBlockIndex, 0, inferredProductCategoryNav);
    }
  }

  return nextTree;
}

export default function StorefrontView({ config, productRows, officeName }) {
  const view = useStorefrontView({ config, productRows, officeName });
  const searchPlaceholder = view.searchPlaceholder;
  const brandLogoSrc = config?.navConfig?.logoUrl || nhCyberSymbolUrl;
  const renderableMobileUiTree = buildRenderableMobileUiTree(
    view.mobileUiTree,
    view.catalogSectionEntries.length > 0,
  );

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
              <div className={styles.brandIdentity}>
                <div className={styles.logoShell} aria-hidden="true">
                  <img
                    className={styles.logo}
                    src={brandLogoSrc}
                    alt=""
                    data-testid="storefront-brand-logo"
                  />
                </div>
                <div className={styles.brandCopy}>
                  {view.coopName ? (
                    <p className={styles.eyebrow}>{view.coopName}</p>
                  ) : null}
                  <h1 className={styles.title}>
                    {view.headerTitle}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        );
      case 'productCategoryNav':
        if (view.catalogSectionEntries.length === 0) {
          return null;
        }

        return (
          <div key={elementKey} className={styles.productCategorySection}>
            <p className={styles.selectionLabel}>대분류 선택</p>
            <div
              className={styles.productCategoryWrap}
              data-testid="storefront-product-category-chips"
            >
              {view.catalogSectionEntries.map(({ sectionId, sectionName }) => (
                <button
                  key={`${elementKey}-${sectionId}`}
                  type="button"
                  className={`${styles.productCategoryChip} ${view.activeSectionTitle === sectionName ? styles.productCategoryChipActive : ''}`}
                  aria-pressed={view.activeSectionTitle === sectionName}
                  onClick={() =>
                    view.handleCategoryRailSectionSelect(sectionName, sectionId)
                  }
                >
                  {sectionName}
                </button>
              ))}
            </div>
          </div>
        );
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
            <p className={styles.selectionLabel}>중분류 선택</p>
            <div
              className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[view.categoryChipVariant] || ''}`}
              data-testid="storefront-category-chips"
              data-chip-variant={view.categoryChipVariant}
              data-category-layout="single-row-scroll"
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
    const blocks = renderableMobileUiTree
      .filter(
        (block) =>
          block.slot === slot &&
          block.type !== 'productSections' &&
          block.type !== 'emptyState',
      );

    if (slot === 'top') {
      blocks.sort((left, right) => {
        const leftOrder = TOP_SLOT_BLOCK_ORDER[left.type] ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = TOP_SLOT_BLOCK_ORDER[right.type] ?? Number.MAX_SAFE_INTEGER;

        return leftOrder - rightOrder;
      });
    }

    return blocks.map((block) => renderBlock(block, slot));
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
                  cardStyle={section?.cardStyle}
                  bodySlots={section?.bodySlots}
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
              표시할 상품이 없습니다. 검색어나 중분류를 다시 확인해 주세요.
            </div>
          ) : null}

          {renderSlot('bottom')}
        </div>
      </div>
    </div>
  );
}
