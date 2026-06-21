import { startTransition, useDeferredValue, useEffect, useId, useState } from 'react';

import { buildSections, buildUniqueMediumCategories, filterHiddenProducts } from '../model/sectionMatching';
import { normalizePageConfig, STOREFRONT_DESIGN_ACCENT_COLORS, TYPOGRAPHY_TONE_VALUES, resolveTitleTextColor } from '../model/storefrontBuilderModel';
import { MOBILE_UI_HELPER_TYPES, normalizeMobileUiTree } from '../model/storefrontUiModel';

const ALL_MEDIUM_CATEGORY_LABEL = '전체';

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

function matchesMediumCategory(product, activeMediumCategory) {
  if (!activeMediumCategory || activeMediumCategory === ALL_MEDIUM_CATEGORY_LABEL) {
    return true;
  }

  return (product?.medium_category ?? '') === activeMediumCategory;
}

function getSectionName(section) {
  return section?.productCategoryName || section?.title || '';
}

function buildSectionEntries(sectionIdPrefix, sections) {
  return (Array.isArray(sections) ? sections : []).map((section, index) => ({
    section,
    sectionName: getSectionName(section),
    sectionId: `${sectionIdPrefix}-${index}`,
  }));
}

function scrollToSection(sectionId) {
  if (typeof document === 'undefined') {
    return;
  }

  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function useStorefrontView({ config, productRows }) {
  const [searchText, setSearchText] = useState('');
  const [activeMediumCategory, setActiveMediumCategory] = useState(ALL_MEDIUM_CATEGORY_LABEL);
  const [activeSectionName, setActiveSectionName] = useState('');
  const [isDesktopCategoryNavOpen, setIsDesktopCategoryNavOpen] = useState(true);

  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = deferredSearchText.trim().toLowerCase();
  const sectionIdPrefix = useId().replace(/:/g, '-');

  const resolvedPageConfig = normalizePageConfig(config?.pageConfig);
  const mobileUiTree = normalizeMobileUiTree(resolvedPageConfig.mobileUiTree, {
    searchEnabled: resolvedPageConfig.searchSection.enabled !== false,
    categoryChipsEnabled: resolvedPageConfig.categoryChips.enabled !== false,
  });
  const baseVisibleProducts = filterHiddenProducts(productRows, config?.hiddenProducts);
  const catalogSectionEntries = buildSectionEntries(
    sectionIdPrefix,
    buildSections(config?.categoryConfigs, baseVisibleProducts),
  );
  const activeSectionEntry =
    catalogSectionEntries.find((entry) => entry.sectionName === activeSectionName) ?? catalogSectionEntries[0] ?? null;
  const activeSectionTitle = activeSectionEntry?.sectionName || '';
  const activeRegionStyles = activeSectionEntry?.section?.renderSpec?.regionStyles ?? {};
  const activeSectionMediumCategories = buildUniqueMediumCategories(activeSectionEntry?.section?.products);
  const mediumCategoryItems =
    activeSectionMediumCategories.length > 0
      ? [ALL_MEDIUM_CATEGORY_LABEL, ...activeSectionMediumCategories]
      : [ALL_MEDIUM_CATEGORY_LABEL];
  const visibleProducts = baseVisibleProducts.filter(
    (product) => matchesSearch(product, searchQuery) && matchesMediumCategory(product, activeMediumCategory),
  );
  const sectionIdByName = new Map(catalogSectionEntries.map(({ sectionName, sectionId }) => [sectionName, sectionId]));
  const sectionEntries = buildSections(config?.categoryConfigs, visibleProducts).map((section, index) => {
    const sectionName = getSectionName(section);

    return {
      section,
      sectionName,
      sectionId: sectionIdByName.get(sectionName) ?? `${sectionIdPrefix}-filtered-${index}`,
    };
  });

  const designDirection = resolvedPageConfig.designDirection;
  const brandColor = config?.navConfig?.brandColor || resolvedPageConfig.theme.brandColor || '#1d4a2e';
  const chipAccentColor = STOREFRONT_DESIGN_ACCENT_COLORS[designDirection] || brandColor;
  const titleTextColorValue = resolveTitleTextColor(resolvedPageConfig.theme.titleTextColor, brandColor);
  const typographyToneValue = TYPOGRAPHY_TONE_VALUES[resolvedPageConfig.theme.typographyTone] || TYPOGRAPHY_TONE_VALUES.standard;
  const title = config?.navConfig?.title || resolvedPageConfig.nav.title || '상품 안내';
  const subtitle =
    config?.navConfig?.subtitle || resolvedPageConfig.nav.subtitle || '고객에게 안내할 상품을 살펴보세요.';
  const searchPlaceholder =
    config?.navConfig?.searchPlaceholder || resolvedPageConfig.searchSection.placeholder || '상품 검색';
  const searchVariant =
    config?.navConfig?.searchVariant || resolvedPageConfig.searchSection.variant || 'pill';
  const categoryChipVariant =
    config?.navConfig?.categoryChipVariant || resolvedPageConfig.categoryChips.variant || 'soft';

  const sectionHeaderBlocks = mobileUiTree.filter(
    (block) =>
      block.slot === 'sectionHeaderBelow' && block.enabled !== false && MOBILE_UI_HELPER_TYPES.includes(block.type),
  );
  const canRenderDesktopCategoryRail =
    mobileUiTree.some((block) => block.type === 'productCategoryNav' && block.enabled !== false) &&
    catalogSectionEntries.length > 0;
  const hasRenderableSections =
    mobileUiTree.some((block) => block.type === 'productSections' && block.enabled !== false) &&
    sectionEntries.length > 0;
  const canRenderEmptyState =
    mobileUiTree.some((block) => block.type === 'emptyState' && block.enabled !== false) &&
    sectionEntries.length === 0;

  useEffect(() => {
    const firstSectionName = catalogSectionEntries[0]?.sectionName || '';

    if (!firstSectionName) {
      if (activeSectionName) {
        setActiveSectionName('');
      }

      return;
    }

    if (!catalogSectionEntries.some((entry) => entry.sectionName === activeSectionName)) {
      setActiveSectionName(firstSectionName);
    }
  }, [activeSectionName, catalogSectionEntries]);

  useEffect(() => {
    if (activeMediumCategory === ALL_MEDIUM_CATEGORY_LABEL) {
      return;
    }

    if (!mediumCategoryItems.includes(activeMediumCategory)) {
      setActiveMediumCategory(ALL_MEDIUM_CATEGORY_LABEL);
    }
  }, [activeMediumCategory, mediumCategoryItems]);

  function handleMediumCategorySelect(item) {
    startTransition(() => {
      setActiveMediumCategory(item);
    });

    if (item !== ALL_MEDIUM_CATEGORY_LABEL && activeSectionEntry?.sectionId) {
      scrollToSection(activeSectionEntry.sectionId);
    }
  }

  function handleCategoryRailSectionSelect(sectionName, sectionId) {
    setActiveSectionName(sectionName);
    setActiveMediumCategory(ALL_MEDIUM_CATEGORY_LABEL);
    scrollToSection(sectionId);
  }

  function handleCategoryRailMediumSelect(sectionName, sectionId, mediumCategory) {
    setActiveSectionName(sectionName);
    startTransition(() => {
      setActiveMediumCategory(mediumCategory);
    });
    scrollToSection(sectionId);
  }

  return {
    searchText,
    setSearchText,
    activeMediumCategory,
    isDesktopCategoryNavOpen,
    setIsDesktopCategoryNavOpen,
    mobileUiTree,
    catalogSectionEntries,
    activeRegionStyles,
    activeSectionTitle,
    activeSectionMediumCategories,
    mediumCategoryItems,
    sectionEntries,
    sectionHeaderBlocks,
    designDirection,
    brandColor,
    chipAccentColor,
    titleTextColorValue,
    typographyToneValue,
    title,
    subtitle,
    searchPlaceholder,
    searchVariant,
    categoryChipVariant,
    canRenderDesktopCategoryRail,
    hasRenderableSections,
    canRenderEmptyState,
    handleMediumCategorySelect,
    handleCategoryRailSectionSelect,
    handleCategoryRailMediumSelect,
  };
}
