import { useDeferredValue, useEffect, useId, useState } from 'react';

import { buildSections, filterHiddenProducts } from '../model/sectionMatching';
import { normalizePageConfig } from '../model/storefrontBuilderModel';
import CardGridSection from './CardGridSection';
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

function matchesSearch(product, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    product?.product_name,
    product?.spec,
    product?.large_category,
    product?.medium_category,
    product?.small_category,
    product?.detail_category,
    product?.nutrient,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function scrollToSection(sectionId) {
  if (typeof document === 'undefined') {
    return;
  }

  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildMediumCategoryItems(products) {
  const seen = new Set();
  const items = ['전체'];

  for (const product of Array.isArray(products) ? products : []) {
    const value = typeof product?.medium_category === 'string' ? product.medium_category.trim() : '';

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    items.push(value);
  }

  return items;
}

function matchesMediumCategory(product, activeMediumCategory) {
  if (!activeMediumCategory || activeMediumCategory === '전체') {
    return true;
  }

  return (product?.medium_category ?? '') === activeMediumCategory;
}

export default function StorefrontView({ config, productRows }) {
  const [searchText, setSearchText] = useState('');
  const [activeMediumCategory, setActiveMediumCategory] = useState('전체');
  const [pendingScrollCategory, setPendingScrollCategory] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = deferredSearchText.trim().toLowerCase();
  const sectionIdPrefix = useId().replace(/:/g, '-');
  const resolvedPageConfig = normalizePageConfig(config?.pageConfig);
  const baseVisibleProducts = filterHiddenProducts(productRows, config?.hiddenProducts);
  const mediumCategoryItems = buildMediumCategoryItems(baseVisibleProducts);
  const visibleProducts = baseVisibleProducts.filter(
    (product) => matchesSearch(product, searchQuery) && matchesMediumCategory(product, activeMediumCategory),
  );
  const sections = buildSections(config?.categoryConfigs, visibleProducts);
  const sectionEntries = sections.map((section, index) => ({
    section,
    sectionId: `${sectionIdPrefix}-${index}`,
  }));
  const designDirection = resolvedPageConfig.designDirection;
  const brandColor = config?.navConfig?.brandColor || resolvedPageConfig.theme.brandColor || '#1d4a2e';
  const title = config?.navConfig?.title || resolvedPageConfig.nav.title || 'Office product page';
  const subtitle =
    config?.navConfig?.subtitle || resolvedPageConfig.nav.subtitle || 'Review the products prepared for customers.';
  const searchPlaceholder =
    config?.navConfig?.searchPlaceholder ||
    resolvedPageConfig.searchSection.placeholder ||
    'Search products';
  const isSearchEnabled = resolvedPageConfig.searchSection.enabled !== false;
  const areCategoryChipsEnabled = resolvedPageConfig.categoryChips.enabled !== false && mediumCategoryItems.length > 1;
  const searchVariant =
    config?.navConfig?.searchVariant || resolvedPageConfig.searchSection.variant || 'pill';
  const categoryChipVariant =
    config?.navConfig?.categoryChipVariant || resolvedPageConfig.categoryChips.variant || 'soft';

  useEffect(() => {
    if (activeMediumCategory === '전체') {
      return;
    }

    if (!mediumCategoryItems.includes(activeMediumCategory)) {
      setActiveMediumCategory('전체');
    }
  }, [activeMediumCategory, mediumCategoryItems]);

  useEffect(() => {
    if (!pendingScrollCategory) {
      return;
    }

    const target = sectionEntries.find(({ section }) =>
      Array.isArray(section?.products) &&
      section.products.some((product) => (product?.medium_category ?? '') === pendingScrollCategory),
    );

    if (target) {
      scrollToSection(target.sectionId);
    }

    setPendingScrollCategory('');
  }, [pendingScrollCategory, sectionEntries]);

  function handleMediumCategorySelect(item) {
    setActiveMediumCategory(item);
    setPendingScrollCategory(item === '전체' ? '' : item);
  }

  return (
    <div
      className={`${styles.page} ${styles[`theme-${designDirection}`] || ''}`}
      data-design-direction={designDirection}
      style={{ '--brand-color': brandColor }}
    >
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.brandBlock}>
            {config?.navConfig?.logoUrl ? (
              <img className={styles.logo} src={config.navConfig.logoUrl} alt="logo" />
            ) : null}
            <div>
              <p className={styles.eyebrow}>Storefront</p>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
          </div>
        </div>

        {isSearchEnabled ? (
          <div className={styles.searchRow}>
            <label
              className={`${styles.searchBox} ${SEARCH_VARIANT_CLASS_NAMES[searchVariant] || ''}`}
              data-testid="storefront-search"
              data-search-variant={searchVariant}
            >
              <input
                type="search"
                className={styles.searchInput}
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <span className={styles.searchIcon} aria-hidden="true" />
            </label>
            <span className={styles.searchHint}>검색창은 고정되고, AI는 문구와 카드 분위기를 다듬습니다.</span>
          </div>
        ) : null}

        {areCategoryChipsEnabled ? (
          <div
            className={`${styles.categoryWrap} ${CHIP_VARIANT_CLASS_NAMES[categoryChipVariant] || ''}`}
            data-testid="storefront-category-chips"
            data-chip-variant={categoryChipVariant}
          >
            {mediumCategoryItems.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.categoryChip} ${activeMediumCategory === item ? styles.categoryChipActive : ''}`}
                onClick={() => handleMediumCategorySelect(item)}
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {sections.length === 0 ? (
        <div className={styles.emptyState}>표시할 상품이 없습니다. 검색어나 중분류를 다시 확인해 주세요.</div>
      ) : (
        sectionEntries.map(({ section, sectionId }) => (
          <CardGridSection
            key={sectionId}
            sectionId={sectionId}
            section={section}
            fields={section?.fields}
            style={section?.style}
          />
        ))
      )}
    </div>
  );
}
