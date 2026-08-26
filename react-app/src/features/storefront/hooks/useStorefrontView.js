import {
  startTransition,
  useDeferredValue,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import {
  buildSections,
  buildUniqueMediumCategories,
  filterHiddenProducts,
} from '../model/storefront-config/sectionMatching';
import { normalizeInformationEntries } from '../model/storefront-config/informationEntriesModel';
import { PAGE_STYLE_HEADER_TITLE_SIZE_VALUES } from '../model/page-design/style/pageStyleModel';
import { normalizePageConfig } from '../model/storefront-config/storefrontBuilderModel';
import { buildDerivedPageTitle } from '../model/storefront-view/pageTitleModel';
import { formatProductUpdatedAt } from '../model/storefront-view/productUpdatedAtModel';
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

const CATEGORY_INFORMATION_ITEM_ID = '__category_information__';
const OFFICE_INFORMATION_ITEM_ID = '__office_information__';

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
  // Set by the builder so its category tab drives the preview's selection too.
  // The public storefront leaves it undefined and keeps owning its own selection.
  selectedSectionName = '',
  // When the price data was last uploaded. Empty until an office has product
  // data, in which case the storefront renders nothing for it.
  productUpdatedAt = '',
}) {
  const [searchText, setSearchText] = useState('');
  const [activeMediumCategory, setActiveMediumCategory] = useState(
    CATEGORY_INFORMATION_ITEM_ID,
  );
  const [activeSectionName, setActiveSectionName] = useState(selectedSectionName);
  const [isDesktopCategoryNavOpen, setIsDesktopCategoryNavOpen] =
    useState(true);
  const [lastExternalSectionName, setLastExternalSectionName] =
    useState(selectedSectionName);

  // Adjusted during render rather than in an effect: an effect would land a
  // frame later and make the preview visibly flip to the old section first.
  if (selectedSectionName && selectedSectionName !== lastExternalSectionName) {
    setLastExternalSectionName(selectedSectionName);
    setActiveSectionName(selectedSectionName);
    setActiveMediumCategory(CATEGORY_INFORMATION_ITEM_ID);
  }

  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = deferredSearchText.trim().toLowerCase();
  const sectionIdPrefix = useId().replace(/:/g, '-');
  const categoryInformationChipId = `${sectionIdPrefix}-category-information-chip`;
  const categoryInformationPanelId = `${sectionIdPrefix}-category-information-panel`;
  const previousActiveSectionTitleRef = useRef(null);

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
  const officeInformationEntries = normalizeInformationEntries(
    config?.pageConfig?.officeInfo,
    { legacyText: resolvedPageConfig.nav.subtitle },
  );
  // A group with no entries would render a bare heading, so drop it here rather
  // than in the panel.
  const officeInformationCategoryGroups = catalogSectionEntries.flatMap(
    ({ sectionName, section }) =>
      section?.infoEntries?.length > 0
        ? [{ categoryName: sectionName, entries: section.infoEntries }]
        : [],
  );
  const canRenderOfficeInformation =
    officeInformationEntries.length > 0 ||
    officeInformationCategoryGroups.length > 0;
  // Yields to a search the same way `effectiveActiveMediumCategory` drops the
  // category-information chip: without it, typing a query leaves the shopper
  // stranded on the panel with no results and no way back but a chip.
  const isOfficeInformationActive =
    canRenderOfficeInformation &&
    activeSectionName === OFFICE_INFORMATION_ITEM_ID &&
    searchQuery === '';
  // The sentinel matches no catalog section, so without the short-circuit the
  // fallback below would quietly resolve the office tab to the first category.
  const activeSectionEntry = isOfficeInformationActive
    ? null
    : catalogSectionEntries.find(
        (entry) => entry.sectionName === activeSectionName,
      ) ??
      catalogSectionEntries[0] ??
      null;
  const activeSectionTitle = activeSectionEntry?.sectionName || '';
  const activeSectionMediumCategories = buildUniqueMediumCategories(
    activeSectionEntry?.section?.products,
  );
  const activeCategoryInfoEntries = activeSectionEntry?.section?.infoEntries ?? [];
  const canRenderCategoryInformation =
    activeCategoryInfoEntries.length > 0 &&
    mobileUiTree.some(
      (block) => block.type === 'categoryChips' && block.enabled !== false,
    );
  const mediumCategoryItems = [
    ALL_MEDIUM_CATEGORY_LABEL,
    ...activeSectionMediumCategories,
  ];
  const isActiveMediumCategoryAvailable =
    mediumCategoryItems.includes(activeMediumCategory) ||
    (canRenderCategoryInformation &&
      activeMediumCategory === CATEGORY_INFORMATION_ITEM_ID);
  const normalizedActiveMediumCategory = isActiveMediumCategoryAvailable
    ? activeMediumCategory
    : canRenderCategoryInformation
      ? CATEGORY_INFORMATION_ITEM_ID
      : mediumCategoryItems[0];
  const effectiveActiveMediumCategory =
    searchQuery === ''
      ? normalizedActiveMediumCategory
      : ALL_MEDIUM_CATEGORY_LABEL;
  const isCategoryInformationActive =
    effectiveActiveMediumCategory === CATEGORY_INFORMATION_ITEM_ID;
  const sectionScopedProducts =
    activeSectionEntry?.section?.products ?? baseVisibleProducts;
  const visibleProducts =
    isCategoryInformationActive || isOfficeInformationActive
      ? []
      : sectionScopedProducts.filter(
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
  const officeName =
    toTrimmedString(externalOfficeName) ||
    resolveOfficeName(activeSectionEntry?.section?.products) ||
    resolveOfficeName(baseVisibleProducts);
  // The title the merchant sees as the default in their input box, and what the
  // storefront falls back to when they leave it blank.
  const derivedPageTitle = buildDerivedPageTitle({ nhName, officeName });
  const pageTitle =
    toTrimmedString(config?.navConfig?.title) ||
    toTrimmedString(resolvedPageConfig.nav.title) ||
    derivedPageTitle;
  const pageDescription =
    toTrimmedString(config?.navConfig?.subtitle) ||
    toTrimmedString(resolvedPageConfig.nav.subtitle) ||
    '';
  const searchPlaceholder =
    config?.navConfig?.searchPlaceholder ||
    resolvedPageConfig.searchSection.placeholder ||
    '찾으시는 자재를 입력하세요';
  const searchVariant =
    config?.navConfig?.searchVariant ||
    resolvedPageConfig.searchSection.variant ||
    'pill';

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
    !isCategoryInformationActive &&
    !isOfficeInformationActive &&
    mobileUiTree.some(
      (block) => block.type === 'emptyState' && block.enabled !== false,
    ) && sectionEntries.length === 0;

  useEffect(() => {
    // The office tab is not a catalog section, so the snap-back below would
    // kick the shopper out of it the moment they select it.
    if (activeSectionName === OFFICE_INFORMATION_ITEM_ID) {
      return;
    }

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
    const isActiveItemAvailable =
      mediumCategoryItems.includes(activeMediumCategory) ||
      (canRenderCategoryInformation &&
        activeMediumCategory === CATEGORY_INFORMATION_ITEM_ID);

    if (!isActiveItemAvailable) {
      setActiveMediumCategory(
        canRenderCategoryInformation
          ? CATEGORY_INFORMATION_ITEM_ID
          : mediumCategoryItems[0],
      );
    }
  }, [
    activeMediumCategory,
    canRenderCategoryInformation,
    mediumCategoryItems,
  ]);

  useEffect(() => {
    const previousActiveSectionTitle = previousActiveSectionTitleRef.current;
    previousActiveSectionTitleRef.current = activeSectionTitle;

    if (
      !previousActiveSectionTitle ||
      previousActiveSectionTitle === activeSectionTitle ||
      !isCategoryInformationActive
    ) {
      return;
    }

    document
      .getElementById(categoryInformationChipId)
      ?.focus({ preventScroll: true });
    document.getElementById(categoryInformationPanelId)?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest',
    });
  }, [
    activeSectionTitle,
    categoryInformationChipId,
    categoryInformationPanelId,
    isCategoryInformationActive,
  ]);

  function handleMediumCategorySelect(item) {
    startTransition(() => {
      setActiveMediumCategory(item);
    });

    if (
      item !== ALL_MEDIUM_CATEGORY_LABEL &&
      item !== CATEGORY_INFORMATION_ITEM_ID &&
      activeSectionEntry?.sectionId
    ) {
      scrollToSection(activeSectionEntry.sectionId);
    }
  }

  function handleCategoryRailSectionSelect(sectionName, sectionId) {
    if (sectionName === OFFICE_INFORMATION_ITEM_ID) {
      setActiveSectionName(OFFICE_INFORMATION_ITEM_ID);
      setActiveMediumCategory(ALL_MEDIUM_CATEGORY_LABEL);
      return;
    }

    const nextSection = catalogSectionEntries.find(
      (entry) => entry.sectionName === sectionName,
    );
    const nextDefaultMediumCategory =
      nextSection?.section?.infoEntries?.length > 0
        ? CATEGORY_INFORMATION_ITEM_ID
        : ALL_MEDIUM_CATEGORY_LABEL;

    setActiveSectionName(sectionName);
    setActiveMediumCategory(nextDefaultMediumCategory);
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
    productUpdatedAtLabel: formatProductUpdatedAt(productUpdatedAt),
    catalogSectionEntries,
    activeSectionTitle,
    activeSectionMediumCategories,
    activeCategoryInfoEntries,
    activeCategoryCardStyle: activeSectionEntry?.section?.cardStyle,
    officeInformationItemId: OFFICE_INFORMATION_ITEM_ID,
    officeInformationEntries,
    officeInformationCategoryGroups,
    canRenderOfficeInformation,
    isOfficeInformationActive,
    categoryInformationItemId: CATEGORY_INFORMATION_ITEM_ID,
    categoryInformationChipId,
    categoryInformationPanelId,
    isCategoryInformationActive,
    mediumCategoryItems,
    sectionEntries,
    sectionHeaderBlocks,
    brandColor,
    pageStyle,
    chipAccentColor,
    officeName,
    titleTextColorValue,
    titleFontSizeValue,
    typographyToneValue,
    derivedPageTitle,
    pageTitle,
    pageDescription,
    searchPlaceholder,
    searchVariant,
    canRenderDesktopCategoryRail,
    hasRenderableSections,
    canRenderEmptyState,
    handleMediumCategorySelect,
    handleCategoryRailSectionSelect,
    handleCategoryRailMediumSelect,
  };
}
