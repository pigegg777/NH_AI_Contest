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

export default function StorefrontView({ config, productRows }) {
  const view = useStorefrontView({ config, productRows });

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
                <img className={styles.logo} src={config.navConfig.logoUrl} alt="로고" />
              ) : null}
              <div>
                <h1 className={styles.title}>{view.activeSectionTitle || view.title}</h1>
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
          <div key={elementKey} className={styles.mobileCategoryBar} data-testid="storefront-mobile-category-bar">
            <strong className={styles.mobileCategoryTitle}>{view.activeSectionTitle}</strong>
            {view.activeSectionMediumCategories.length > 0 ? (
              <div className={styles.mobileCategoryMeta}>
                {view.activeSectionMediumCategories.map((item) => (
                  <span key={`${elementKey}-${item}`} className={styles.mobileCategoryMetaItem}>
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
                aria-label={view.searchPlaceholder}
                placeholder={view.searchPlaceholder}
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
            <button
              type="button"
              className={styles.categoryChipsToggle}
              data-testid="storefront-category-chips-toggle"
              aria-expanded={view.isCategoryChipsExpanded}
              onClick={() => view.setIsCategoryChipsExpanded((current) => !current)}
            >
              {view.isCategoryChipsExpanded ? '카테고리 접기' : '카테고리 펼치기'}
            </button>
            <div
              className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[view.categoryChipVariant] || ''}`}
              data-testid="storefront-category-chips"
              data-chip-variant={view.categoryChipVariant}
              data-chip-size="compact"
              style={view.isCategoryChipsExpanded ? undefined : { display: 'none' }}
            >
              {view.isCategoryChipsExpanded
                ? view.mediumCategoryItems.map((item) => (
                    <button
                      key={`${elementKey}-${item}`}
                      type="button"
                      className={`${styles.categoryChip} ${view.activeMediumCategory === item ? styles.categoryChipActive : ''}`}
                      onClick={() => view.handleMediumCategorySelect(item)}
                    >
                      {item}
                    </button>
                  ))
                : null}
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
      .filter((block) => block.slot === slot && block.type !== 'productSections' && block.type !== 'emptyState')
      .map((block) => renderBlock(block, slot));
  }

  return (
    <div
      className={`${styles.page} ${styles[`theme-${view.designDirection}`] || ''}`}
      data-design-direction={view.designDirection}
      style={{ '--brand-color': view.brandColor, '--chip-accent': view.chipAccentColor }}
    >
      <header className={styles.hero}>
        {HEADER_SLOT_ORDER.map((slot) => renderSlot(slot))}
      </header>

      <div className={`${styles.bodyShell} ${!view.canRenderDesktopCategoryRail ? styles.bodyShellSolo : ''}`}>
        {view.canRenderDesktopCategoryRail ? (
          <DesktopCategoryRail
            catalogSectionEntries={view.catalogSectionEntries}
            activeSectionTitle={view.activeSectionTitle}
            title={view.title}
            isOpen={view.isDesktopCategoryNavOpen}
            onToggle={() => view.setIsDesktopCategoryNavOpen((current) => !current)}
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
                  sectionHeaderContent={view.sectionHeaderBlocks.map((block) => (
                    <HelperBlock key={`${sectionId}-${block.id}`} block={block} />
                  ))}
                />
              ))
            : null}

          {view.canRenderEmptyState ? (
            <div className={styles.emptyState}>표시할 상품이 없습니다. 검색어와 중분류를 다시 확인해 주세요.</div>
          ) : null}

          {renderSlot('bottom')}
        </div>
      </div>
    </div>
  );
}
