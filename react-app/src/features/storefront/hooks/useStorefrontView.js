import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useState,
} from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import {
  buildSections,
  buildUniqueMediumCategories,
  filterHiddenProducts,
} from '../model/storefront-config/sectionMatching';
import { PAGE_STYLE_HEADER_TITLE_SIZE_VALUES } from '../model/page-design/pageStyleModel';
import { normalizePageConfig } from '../model/storefront-config/storefrontBuilderModel';
import {
  MOBILE_UI_HELPER_TYPES,
  normalizeMobileUiTree,
} from '../model/storefront-config/storefrontUiModel';

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
  if (
    !activeMediumCategory ||
    activeMediumCategory === ALL_MEDIUM_CATEGORY_LABEL
  ) {
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

  document
    .getElementById(sectionId)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resolveOfficeName(products) {
  for (const product of Array.isArray(products) ? products : []) {
    const officeName = toTrimmedString(
      product?.officeName || product?.office_name,
    );

    if (officeName) {
      return officeName;
    }
  }

  return '';
}

export function useStorefrontView({
  config,
  productRows,
  officeName: externalOfficeName,
  nhName,
}) {
  const [searchText, setSearchText] = useState('');
  const [activeMediumCategory, setActiveMediumCategory] = useState(
    ALL_MEDIUM_CATEGORY_LABEL,
  );
  const [activeSectionName, setActiveSectionName] = useState('');
  const [isDesktopCategoryNavOpen, setIsDesktopCategoryNavOpen] =
    useState(true);

  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = deferredSearchText.trim().toLowerCase();
  const effectiveActiveMediumCategory =
    searchQuery === '' ? activeMediumCategory : ALL_MEDIUM_CATEGORY_LABEL;
  const sectionIdPrefix = useId().replace(/:/g, '-');

  const resolvedPageConfig = normalizePageConfig(config?.pageConfig);
  const mobileUiTree = normalizeMobileUiTree(resolvedPageConfig.mobileUiTree, {
    searchEnabled: resolvedPageConfig.searchSection.enabled !== false,
    categoryChipsEnabled: resolvedPageConfig.categoryChips.enabled !== false,
  });
  const baseVisibleProducts = filterHiddenProducts(
    productRows,
    config?.hiddenProducts,
  );
  const catalogSectionEntries = buildSectionEntries(
    sectionIdPrefix,
    buildSections(config?.categoryConfigs, baseVisibleProducts),
  );
  const activeSectionEntry =
    catalogSectionEntries.find(
      (entry) => entry.sectionName === activeSectionName,
    ) ??
    catalogSectionEntries[0] ??
    null;
  const activeSectionTitle = activeSectionEntry?.sectionName || '';
  const activeSectionMediumCategories = buildUniqueMediumCategories(
    activeSectionEntry?.section?.products,
  );
  const mediumCategoryItems =
    activeSectionMediumCategories.length > 0
      ? [ALL_MEDIUM_CATEGORY_LABEL, ...activeSectionMediumCategories]
      : [ALL_MEDIUM_CATEGORY_LABEL];
  const sectionScopedProducts =
    activeSectionEntry?.section?.products ?? baseVisibleProducts;
  const visibleProducts = sectionScopedProducts.filter(
    (product) =>
      matchesSearch(product, searchQuery) &&
      matchesMediumCategory(product, effectiveActiveMediumCategory),
  );
  const sectionIdByName = new Map(
    catalogSectionEntries.map(({ sectionName, sectionId }) => [
      sectionName,
      sectionId,
    ]),
  );
  const sectionEntries = buildSections(
    config?.categoryConfigs,
    visibleProducts,
  ).map((section, index) => {
    const sectionName = getSectionName(section);

    return {
      section,
      sectionName,
      sectionId:
        sectionIdByName.get(sectionName) ??
        `${sectionIdPrefix}-filtered-${index}`,
    };
  });

  const pageStyle = resolvedPageConfig.pageStyle;
  const brandColor = pageStyle.palette.accentHex;
  const chipAccentColor = pageStyle.palette.accentHex;
  const titleTextColorValue = pageStyle.header.titleColorHex;
  const titleFontSizeValue =
    PAGE_STYLE_HEADER_TITLE_SIZE_VALUES[pageStyle.header.titleFontSizeToken] ??
    PAGE_STYLE_HEADER_TITLE_SIZE_VALUES.md;
  const typographyToneValue = {
    headingWeight: pageStyle.header.fontWeight,
    bodyWeight: Math.max(pageStyle.header.fontWeight - 200, 400),
    letterSpacing: pageStyle.header.letterSpacing,
  };
  const coopName =
    config?.navConfig?.title || resolvedPageConfig.nav.title || '';
  const title = coopName || '상품 안내';
  const officeName =
    toTrimmedString(externalOfficeName) ||
    resolveOfficeName(activeSectionEntry?.section?.products) ||
    resolveOfficeName(baseVisibleProducts);
  const headerOrgName = [toTrimmedString(nhName), officeName]
    .filter(Boolean)
    .join(' ');
  const headerOrgLine = headerOrgName
    ? `${headerOrgName} 농자재 정보`
    : title;
  const subtitle =
    config?.navConfig?.subtitle ||
    resolvedPageConfig.nav.subtitle ||
    '고객님께 안내할 상품을 둘러보세요.';
  const searchPlaceholder =
    config?.navConfig?.searchPlaceholder ||
    resolvedPageConfig.searchSection.placeholder ||
    '상품 검색';
  const searchVariant =
    config?.navConfig?.searchVariant ||
    resolvedPageConfig.searchSection.variant ||
    'pill';
  const categoryChipVariant =
    config?.navConfig?.categoryChipVariant ||
    resolvedPageConfig.categoryChips.variant ||
    'soft';

  const sectionHeaderBlocks = mobileUiTree.filter(
    (block) =>
      block.slot === 'sectionHeaderBelow' &&
      block.enabled !== false &&
      MOBILE_UI_HELPER_TYPES.includes(block.type),
  );
  const canRenderDesktopCategoryRail =
    mobileUiTree.some(
      (block) => block.type === 'productCategoryNav' && block.enabled !== false,
    ) && catalogSectionEntries.length > 0;
  const hasRenderableSections =
    mobileUiTree.some(
      (block) => block.type === 'productSections' && block.enabled !== false,
    ) && sectionEntries.length > 0;
  const canRenderEmptyState =
    mobileUiTree.some(
      (block) => block.type === 'emptyState' && block.enabled !== false,
    ) && sectionEntries.length === 0;

  useEffect(() => {
    const firstSectionName = catalogSectionEntries[0]?.sectionName || '';

    if (!firstSectionName) {
      if (activeSectionName) {
        setActiveSectionName('');
      }

      return;
    }

    if (
      !catalogSectionEntries.some(
        (entry) => entry.sectionName === activeSectionName,
      )
    ) {
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

  function handleCategoryRailMediumSelect(
    sectionName,
    sectionId,
    mediumCategory,
  ) {
    setActiveSectionName(sectionName);
    startTransition(() => {
      setActiveMediumCategory(mediumCategory);
    });
    scrollToSection(sectionId);
  }

  return {
    searchText,
    setSearchText,
    activeMediumCategory: effectiveActiveMediumCategory,
    isDesktopCategoryNavOpen,
    setIsDesktopCategoryNavOpen,
    mobileUiTree,
    catalogSectionEntries,
    activeSectionTitle,
    activeSectionMediumCategories,
    mediumCategoryItems,
    sectionEntries,
    sectionHeaderBlocks,
    brandColor,
    pageStyle,
    chipAccentColor,
    coopName,
    officeName,
    titleTextColorValue,
    titleFontSizeValue,
    typographyToneValue,
    headerOrgLine,
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
