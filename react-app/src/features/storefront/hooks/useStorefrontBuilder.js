import { useEffect, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import {
  DEFAULT_NAV_CONFIG,
  DEFAULT_PAGE_CONFIG,
  STOREFRONT_FIELD_LABELS,
  buildStorefrontSavePayload,
  deriveAvailableCategoryFields,
  deriveEffectiveScalarKeys,
  deriveProductCategoryOptions,
  findCategoryConfigRow,
  flattenProductEntries,
  normalizeNavConfig,
  normalizePageConfig,
  resolveCategoryDraft,
} from '../model/storefrontBuilderModel';
import { sanitizeMobileUiTree } from '../model/storefrontUiModel';
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from '../services/storefrontConfigService';
import { useCardAiDesign } from './useCardAiDesign';
import { useDataSelectionDraft } from './useDataSelectionDraft';
import { usePageAiDesign } from './usePageAiDesign';

const FETCH_ERROR_MESSAGE = 'We could not load the storefront builder.';
const SAVE_ERROR_MESSAGE = 'We could not save the storefront draft.';
const DATA_SELECTION_STEP_INDEX = 2;
const FINAL_STEP_INDEX = 3;

function getInitialCategoryName(productEntries, existingConfig) {
  const existingCategoryName = findCategoryConfigRow(
    existingConfig?.categoryConfigs,
    existingConfig?.categoryConfigs?.[0]?.productCategoryName,
  )?.productCategoryName;

  if (existingCategoryName) {
    return existingCategoryName;
  }

  return productEntries?.[0]?.categoryName ?? '';
}

export function useStorefrontBuilder({ officeCode }) {
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [productEntries, setProductEntries] = useState([]);
  const [existingConfig, setExistingConfig] = useState(null);
  const [hiddenProducts, setHiddenProducts] = useState([]);
  const [selectedProductCategoryName, setSelectedProductCategoryName] =
    useState('');
  const [selectedMediumCategories, setSelectedMediumCategories] = useState([]);
  const [representativeMediumCategory, setRepresentativeMediumCategory] =
    useState('');
  const pageAi = usePageAiDesign();
  const cardAi = useCardAiDesign();
  const [navConfig, setNavConfig] = useState(DEFAULT_NAV_CONFIG);
  const [mobileUiTree, setMobileUiTree] = useState(() =>
    sanitizeMobileUiTree(DEFAULT_PAGE_CONFIG.mobileUiTree),
  );

  const allProductRows = flattenProductEntries(productEntries);
  const currentEntry =
    productEntries.find(
      (entry) => entry?.categoryName === selectedProductCategoryName,
    ) ?? null;
  const officeName = toTrimmedString(
    currentEntry?.officeName ?? productEntries[0]?.officeName,
  );
  const productCategoryOptions = deriveProductCategoryOptions(
    productEntries,
    existingConfig,
  );
  const availableCategoryFields = deriveAvailableCategoryFields(
    currentEntry?.rows,
  );
  const effectiveScalarKeys = deriveEffectiveScalarKeys(currentEntry?.rows);
  const hasSavedStorefront =
    toTrimmedString(officeCode) !== '' &&
    Array.isArray(existingConfig?.categoryConfigs) &&
    existingConfig.categoryConfigs.length > 0;
  const dataSelection = useDataSelectionDraft({
    allowedScalarKeys: effectiveScalarKeys,
    initialFields: ['product_name'],
  });

  function markDirty() {
    setHasUnsavedChanges(true);
    setStatus((current) => (current === 'saved' ? 'ready' : current));
  }

  function hydrateCategoryDraft(
    categoryName,
    nextProductEntries,
    nextExistingConfig,
  ) {
    const resolvedCategoryName = categoryName || '';
    const resolvedDraft = resolveCategoryDraft({
      productCategoryName: resolvedCategoryName,
      productEntries: nextProductEntries,
      existingConfig: nextExistingConfig,
    });

    setSelectedProductCategoryName(resolvedCategoryName);
    setSelectedMediumCategories(resolvedDraft.selectedMediumCategories);
    setRepresentativeMediumCategory(
      resolvedDraft.representativeMediumCategory,
    );
    dataSelection.reset(
      resolvedDraft.cardFields,
      deriveEffectiveScalarKeys(resolvedDraft.entry?.rows),
    );
    cardAi.hydrateCardStyle(resolvedDraft.cardStyle, resolvedDraft.bodySlots);
  }

  useEffect(() => {
    let isCancelled = false;

    setStatus('loading');
    setErrorMessage('');
    setHasUnsavedChanges(false);
    setHasStarted(false);
    setCurrentStep(0);

    Promise.all([
      fetchOfficeProductDataEntries({ officeCode }),
      fetchStorefrontConfig({ officeCode }),
    ])
      .then(([nextProductEntries, config]) => {
        if (isCancelled) {
          return;
        }

        const normalizedPageConfig = normalizePageConfig(config?.pageConfig);
        const nextCategoryName = getInitialCategoryName(
          nextProductEntries,
          config,
        );

        setProductEntries(nextProductEntries);
        setExistingConfig(config);
        setHiddenProducts(config?.hiddenProducts ?? []);
        pageAi.hydratePageStyle(normalizedPageConfig.pageStyle);
        setMobileUiTree(
          sanitizeMobileUiTree(normalizedPageConfig.mobileUiTree),
        );
        setNavConfig(
          normalizeNavConfig({
            title: config?.navConfig?.title ?? normalizedPageConfig.nav.title,
            subtitle:
              config?.navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
            brandColor:
              config?.navConfig?.brandColor ??
              normalizedPageConfig.theme.brandColor,
            searchPlaceholder:
              config?.navConfig?.searchPlaceholder ??
              normalizedPageConfig.searchSection.placeholder,
            logoUrl:
              config?.navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
            searchVariant:
              config?.navConfig?.searchVariant ??
              normalizedPageConfig.searchSection.variant,
            categoryChipVariant:
              config?.navConfig?.categoryChipVariant ??
              normalizedPageConfig.categoryChips.variant,
          }),
        );
        hydrateCategoryDraft(nextCategoryName, nextProductEntries, config);
        setStatus('ready');
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : FETCH_ERROR_MESSAGE,
        );
        setStatus('error');
      });

    return () => {
      isCancelled = true;
    };
  }, [officeCode]);

  function startSession() {
    setHasStarted(true);
    setCurrentStep(0);
  }

  function selectProductCategory(categoryName) {
    if (
      toTrimmedString(categoryName) !== toTrimmedString(selectedProductCategoryName)
    ) {
      markDirty();
    }

    hydrateCategoryDraft(categoryName, productEntries, existingConfig);
  }

  function undoAiChanges() {
    markDirty();
    cardAi.undoLastCardAiDesign();
  }

  function goNext() {
    setCurrentStep((current) => {
      if (current === DATA_SELECTION_STEP_INDEX && !dataSelection.isConfirmed) {
        return current;
      }

      return Math.min(current + 1, FINAL_STEP_INDEX);
    });
  }

  function confirmDataSelection() {
    markDirty();
    dataSelection.confirm();
    cardAi.hydrateCardStyle();
    setCurrentStep(FINAL_STEP_INDEX);
  }

  function goPrevious() {
    setCurrentStep((current) => Math.max(current - 1, 0));
  }

  async function applyAiSuggestion() {
    markDirty();
    setHasStarted(true);
    setCurrentStep(FINAL_STEP_INDEX);

    await cardAi.applyCardAiDesign({
      visibleFields: dataSelection.committed,
      fieldLabels: STOREFRONT_FIELD_LABELS,
      productCategoryName: selectedProductCategoryName,
    });
  }

  async function saveDraft() {
    setStatus('saving');
    setErrorMessage('');

    try {
      const payload = buildStorefrontSavePayload({
        officeCode,
        existingConfig,
        hiddenProducts,
        selectedProductCategoryName,
        selectedMediumCategories,
        representativeMediumCategory,
        cardStyle: cardAi.cardStyle,
        cardFields: dataSelection.committed,
        bodySlots: cardAi.bodySlots,
        navConfig,
        mobileUiTree,
        pageStyle: pageAi.pageStyle,
        allowedScalarKeys: effectiveScalarKeys,
      });

      await upsertStorefrontConfig(payload);
      setExistingConfig(payload);
      setHiddenProducts(payload.hiddenProducts);
      setHasUnsavedChanges(false);
      setStatus('saved');
      pageAi.discardPageAiDesignSession();
      cardAi.discardCardAiDesignSession();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : SAVE_ERROR_MESSAGE,
      );
      setStatus('save-error');
    }
  }

  const previewCardFields =
    currentStep === DATA_SELECTION_STEP_INDEX
      ? dataSelection.draft
      : dataSelection.committed;

  const previewConfig = selectedProductCategoryName
    ? buildStorefrontSavePayload({
        officeCode,
        existingConfig,
        hiddenProducts,
        selectedProductCategoryName,
        selectedMediumCategories,
        representativeMediumCategory,
        cardStyle: cardAi.cardStyle,
        cardFields: previewCardFields,
        bodySlots: cardAi.bodySlots,
        navConfig,
        mobileUiTree,
        pageStyle: pageAi.pageStyle,
        allowedScalarKeys: effectiveScalarKeys,
      })
    : {
        officeCode,
        pageConfig: normalizePageConfig({
          ...existingConfig?.pageConfig,
          pageStyle: pageAi.pageStyle,
        }),
        navConfig: normalizeNavConfig(existingConfig?.navConfig),
        categoryConfigs: existingConfig?.categoryConfigs ?? [],
        hiddenProducts,
      };

  const productCategoryStep = {
    productCategoryOptions,
    selectedProductCategoryName,
    selectProductCategory,
  };

  const pageDesignStep = {
    pageAiDesign: pageAi.pageAiDesign,
    isApplyingPageAiDesign: pageAi.isApplyingPageAiDesign,
    pageAiErrorMessage: pageAi.pageAiErrorMessage,
    setPagePrompt: pageAi.setPrompt,
    setPageTargetScope: pageAi.setTargetScope,
    applyPageAiDesign: pageAi.applyPageAiDesign,
    selectedProductCategoryName,
  };

  const dataSelectionStep = {
    availableCategoryFields,
    draftDataSelection: dataSelection.draft,
    committedDataSelection: dataSelection.committed,
    isDataSelectionConfirmed: dataSelection.isConfirmed,
    toggleDraftField: dataSelection.toggleField,
    confirmDataSelection,
    goNext,
  };

  const cardDesignStep = {
    cardStyle: cardAi.cardStyle,
    cardAiDesign: cardAi.cardAiDesign,
    isAiApplying: cardAi.isApplyingCardAiDesign,
    aiErrorMessage: cardAi.cardAiErrorMessage,
    cardAiWarningMessage: cardAi.cardAiWarningMessage,
    canUndoAiChanges: cardAi.canUndoCardAiDesign,
    setPrompt: cardAi.setPrompt,
    setTargetScope: cardAi.setTargetScope,
    setCardsPerRow: cardAi.setCardsPerRow,
    applyAiSuggestion,
    undoAiChanges,
    saveDraft,
    status,
    qrExport: {
      officeCode: toTrimmedString(officeCode),
      officeName,
      isAvailable: hasSavedStorefront,
      hasUnsavedChanges,
    },
  };

  return {
    status,
    errorMessage,
    hasStarted,
    currentStep,
    selectedProductCategoryName,
    previewConfig,
    previewProductRows: allProductRows,
    startSession,
    goNext,
    goPrevious,
    productCategoryStep,
    pageDesignStep,
    dataSelectionStep,
    cardDesignStep,
  };
}
