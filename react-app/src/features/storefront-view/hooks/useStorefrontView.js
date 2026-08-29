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
import { normalizeInformationEntries } from '../model/storefront-config/informationEntriesModel';
import { PAGE_STYLE_HEADER_TITLE_SIZE_VALUES } from '../model/page-design/style/pageStyleModel';
import { normalizePageConfig } from '../model/storefront-config/storefrontBuilderModel';
import { buildDerivedPageTitle } from '../model/storefront-view/pageTitleModel';
import { buildInformationNavigationItems } from '../model/storefront-view/informationNavigationModel';
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
    ALL_MEDIUM_CATEGORY_LABEL,
  );
  const [activeIntroTarget, setActiveIntroTarget] = useState(
    OFFICE_INFORMATION_ITEM_ID,
  );
  const [isGuideNavigationRequested, setIsGuideNavigationRequested] =
    useState(true);
  const [activeSectionName, setActiveSectionName] = useState(selectedSectionName);
  const [isDesktopCategoryNavOpen, setIsDesktopCategoryNavOpen] =
    useState(true);
  const [lastExternalSectionName, setLastExternalSectionName] =
    useState(selectedSectionName);

  // Adjusted during render rather than in an effect: an effect would land a
  // frame later and make the preview visibly flip to the old section first.
  if (selectedSectionName !== lastExternalSectionName) {
    setLastExternalSectionName(selectedSectionName);

    if (selectedSectionName) {
      setActiveSectionName(selectedSectionName);
      setActiveMediumCategory(ALL_MEDIUM_CATEGORY_LABEL);
      setActiveIntroTarget(selectedSectionName);
      setIsGuideNavigationRequested(false);
    } else {
      setActiveIntroTarget(OFFICE_INFORMATION_ITEM_ID);
      setIsGuideNavigationRequested(true);
    }
  }

  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = deferredSearchText.trim().toLowerCase();
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
  const officeInformationEntries = normalizeInformationEntries(
    config?.pageConfig?.officeInfo,
    { legacyText: resolvedPageConfig.nav.subtitle },
  );
  const activeCategoryInformationEntries =
    catalogSectionEntries.find(
      (entry) => entry.sectionName === activeIntroTarget,
    )?.section?.infoEntries ?? [];
  const activeInformationIntro =
    activeIntroTarget === OFFICE_INFORMATION_ITEM_ID &&
    officeInformationEntries.length > 0
      ? { kind: 'office', categoryName: '', entries: officeInformationEntries }
      : activeIntroTarget && activeCategoryInformationEntries.length > 0
        ? {
            kind: 'category',
            categoryName: activeIntroTarget,
            entries: activeCategoryInformationEntries,
          }
        : null;
  const hasInformationContent =
    officeInformationEntries.length > 0 ||
    catalogSectionEntries.some(
      (entry) => (entry.section?.infoEntries?.length ?? 0) > 0,
    );
  const isInformationIntroActive =
    activeInformationIntro !== null && searchQuery === '';
  const isOfficeInformationIntroActive =
    isInformationIntroActive && activeInformationIntro.kind === 'office';
  // The office intro has no catalog section, so keep it from quietly falling
  // through to the first category while that intro is visible.
  const activeSectionEntry = isOfficeInformationIntroActive
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
  const mediumCategoryItems = [
    ALL_MEDIUM_CATEGORY_LABEL,
    ...activeSectionMediumCategories,
  ];
  const isActiveMediumCategoryAvailable = mediumCategoryItems.includes(
    activeMediumCategory,
  );
  const informationNavigationItems = buildInformationNavigationItems({
    officeEntries: officeInformationEntries,
    catalogSectionEntries,
  });
  const activeInformationNavigationItem =
    informationNavigationItems.find((item) =>
      item.kind === 'office'
        ? activeIntroTarget === OFFICE_INFORMATION_ITEM_ID
        : item.categoryName === activeIntroTarget,
    ) ?? informationNavigationItems[0] ?? null;
  const isGuideNavigationActive =
    isGuideNavigationRequested &&
    informationNavigationItems.length > 0 &&
    (activeIntroTarget !== OFFICE_INFORMATION_ITEM_ID ||
      officeInformationEntries.length > 0);
  const normalizedActiveMediumCategory = isActiveMediumCategoryAvailable
    ? activeMediumCategory
    : mediumCategoryItems[0];
  const effectiveActiveMediumCategory =
    searchQuery === ''
      ? normalizedActiveMediumCategory
      : ALL_MEDIUM_CATEGORY_LABEL;
  const sectionScopedProducts =
    activeSectionEntry?.section?.products ?? baseVisibleProducts;
  const visibleProducts =
    isInformationIntroActive
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
    !isInformationIntroActive &&
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
    const isActiveItemAvailable = mediumCategoryItems.includes(
      activeMediumCategory,
    );

    if (!isActiveItemAvailable) {
      setActiveMediumCategory(mediumCategoryItems[0]);
    }
  }, [activeMediumCategory, mediumCategoryItems]);

  function handleMediumCategorySelect(item) {
    setActiveIntroTarget('');
    setIsGuideNavigationRequested(false);
    startTransition(() => {
      setActiveMediumCategory(item);
    });

    if (
      item !== ALL_MEDIUM_CATEGORY_LABEL &&
      activeSectionEntry?.sectionId
    ) {
      scrollToSection(activeSectionEntry.sectionId);
    }
  }

  function handleCategoryRailSectionSelect(sectionName, sectionId) {
    setActiveSectionName(sectionName);
    setActiveMediumCategory(ALL_MEDIUM_CATEGORY_LABEL);
    const hasCategoryInformation =
      catalogSectionEntries.find((entry) => entry.sectionName === sectionName)
        ?.section?.infoEntries?.length > 0;
    setActiveIntroTarget(hasCategoryInformation ? sectionName : '');
    setIsGuideNavigationRequested(false);

    if (!hasCategoryInformation) {
      scrollToSection(sectionId);
    }
  }

  function handleCategoryRailMediumSelect(
    sectionName,
    sectionId,
    mediumCategory,
  ) {
    setActiveSectionName(sectionName);
    setActiveIntroTarget('');
    setIsGuideNavigationRequested(false);
    startTransition(() => {
      setActiveMediumCategory(mediumCategory);
    });
    scrollToSection(sectionId);
  }

  function handleSearchTextChange(value) {
    setSearchText(value);

    if (value.trim() !== '') {
      setActiveIntroTarget('');
      setIsGuideNavigationRequested(false);
    }
  }

  function handleGuideNavigationSelect() {
    const firstItem = informationNavigationItems[0];

    if (!firstItem) return;

    setIsGuideNavigationRequested(true);
    setActiveIntroTarget(
      firstItem.kind === 'office'
        ? OFFICE_INFORMATION_ITEM_ID
        : firstItem.categoryName,
    );
  }

  function handleInformationItemSelect(item) {
    setActiveIntroTarget(
      item.kind === 'office' ? OFFICE_INFORMATION_ITEM_ID : item.categoryName,
    );
  }

  return {
    searchText,
    setSearchText: handleSearchTextChange,
    activeMediumCategory: isInformationIntroActive
      ? ''
      : effectiveActiveMediumCategory,
    isDesktopCategoryNavOpen,
    setIsDesktopCategoryNavOpen,
    mobileUiTree,
    productUpdatedAtLabel: formatProductUpdatedAt(productUpdatedAt),
    catalogSectionEntries,
    activeSectionTitle,
    activeSectionMediumCategories,
    activeCategoryCardStyle: activeSectionEntry?.section?.cardStyle,
    activeInformationIntro,
    hasInformationContent,
    informationNavigationItems,
    activeInformationNavigationItem,
    isGuideNavigationActive,
    isInformationIntroActive,
    isOfficeInformationIntroActive,
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
    searchPlaceholder,
    searchVariant,
    canRenderDesktopCategoryRail,
    hasRenderableSections,
    canRenderEmptyState,
    handleMediumCategorySelect,
    handleCategoryRailSectionSelect,
    handleCategoryRailMediumSelect,
    handleGuideNavigationSelect,
    handleInformationItemSelect,
  };
}
