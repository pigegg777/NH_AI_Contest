import { useEffect, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/office-product-data/officeProductDataReadService';
import { CARD_AI_TARGET_SCOPE_OPTIONS } from '../model/card-design/cardAiDesignModel';
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../model/page-design/pageAiDesignModel';
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
} from '../model/storefront-config/storefrontBuilderModel';
import { sanitizeMobileUiTree } from '../model/storefront-config/storefrontUiModel';
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from '../services/storefront-config/storefrontConfigService';
import { useCardAiDesign } from './useCardAiDesign';
import { useDataSelectionDraft } from './useDataSelectionDraft';
import { usePageAiDesign } from './usePageAiDesign';
import { useUnifiedDesignSession } from './useUnifiedDesignSession';

const FETCH_ERROR_MESSAGE = 'We could not load the storefront builder.';
const SAVE_ERROR_MESSAGE = 'We could not save the storefront draft.';
const DATA_SELECTION_STEP_INDEX = 1;
const FINAL_STEP_INDEX = 2;
const MAX_SHARED_AI_HISTORY_MESSAGES = 12;

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

function resolveScopeLabel(scopeOptions, scopeId) {
  if (!scopeId) {
    return '';
  }

  return scopeOptions.find((option) => option.id === scopeId)?.label ?? '';
}

function buildSharedHistory(messages) {
  return messages
    .slice(-MAX_SHARED_AI_HISTORY_MESSAGES)
    .map((message) => ({ role: message.role, text: message.text }));
}

export function useStorefrontBuilder({ officeCode, nhName }) {
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
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
  const pageAi = usePageAiDesign({ officeCode });
  const cardAi = useCardAiDesign({ officeCode });
  const unifiedDesign = useUnifiedDesignSession();
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
  const dataSelection = useDataSelectionDraft({
    allowedScalarKeys: effectiveScalarKeys,
    initialFields: ['product_name'],
  });

  function markDirty() {
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
        unifiedDesign.resetSession();
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
    const isDifferentCategory =
      toTrimmedString(categoryName) !==
      toTrimmedString(selectedProductCategoryName);

    if (isDifferentCategory) {
      markDirty();
      unifiedDesign.resetSession();
      pageAi.discardPageAiDesignSession();
      cardAi.discardCardAiDesignSession();
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

  async function applyUnifiedAiDesign() {
    const prompt = toTrimmedString(unifiedDesign.promptDraft);
    const selectedTarget = unifiedDesign.selectedTarget;
    const scopeOptions =
      selectedTarget === 'card'
        ? CARD_AI_TARGET_SCOPE_OPTIONS
        : PAGE_AI_TARGET_SCOPE_OPTIONS;
    const targetScope =
      selectedTarget === 'card'
        ? cardAi.cardAiDesign.targetScope
        : pageAi.pageAiDesign.targetScope;

    if (!prompt) {
      if (selectedTarget === 'card') {
        await cardAi.applyCardAiDesign({
          prompt,
          targetScope,
          visibleFields: dataSelection.committed,
          fieldLabels: STOREFRONT_FIELD_LABELS,
          productCategoryName: selectedProductCategoryName,
        });
      } else {
        await pageAi.applyPageAiDesign({
          prompt,
          targetScope,
        });
      }

      return;
    }

    markDirty();
    setHasStarted(true);
    setCurrentStep(FINAL_STEP_INDEX);

    const targetLabel = selectedTarget === 'card' ? '카드' : '페이지';
    const scopeLabel = resolveScopeLabel(scopeOptions, targetScope);
    const userMessage = unifiedDesign.createMessage({
      role: 'user',
      target: selectedTarget,
      targetLabel,
      scope: targetScope,
      scopeLabel,
      text: prompt,
    });
    const nextMessages = [...unifiedDesign.messages, userMessage];

    unifiedDesign.setMessages(nextMessages);
    unifiedDesign.setPromptDraft('');

    const history = buildSharedHistory(nextMessages);
    const result =
      selectedTarget === 'card'
        ? await cardAi.applyCardAiDesign({
            prompt,
            targetScope,
            history,
            visibleFields: dataSelection.committed,
            fieldLabels: STOREFRONT_FIELD_LABELS,
            productCategoryName: selectedProductCategoryName,
          })
        : await pageAi.applyPageAiDesign({
            prompt,
            targetScope,
            history,
          });

    if (!result?.ok) {
      return;
    }

    unifiedDesign.setMessages((current) => [
      ...current,
      unifiedDesign.createMessage({
        role: 'assistant',
        target: selectedTarget,
        targetLabel,
        scope: targetScope,
        scopeLabel,
        text: result.explanation,
        suggestion: result.suggestion,
        warningMessage: result.warningMessage,
      }),
    ]);
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
      setStatus('saved');
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

  const previewBodySlots =
    currentStep === DATA_SELECTION_STEP_INDEX ? [] : cardAi.bodySlots;

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
        bodySlots: previewBodySlots,
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

  const dataSelectionStep = {
    availableCategoryFields,
    draftDataSelection: dataSelection.draft,
    committedDataSelection: dataSelection.committed,
    isDataSelectionConfirmed: dataSelection.isConfirmed,
    toggleDraftField: dataSelection.toggleField,
    confirmDataSelection,
  };

  const isCardTarget = unifiedDesign.selectedTarget === 'card';
  const unifiedDesignStep = {
    selectedTarget: unifiedDesign.selectedTarget,
    setSelectedTarget: unifiedDesign.setSelectedTarget,
    promptDraft: unifiedDesign.promptDraft,
    setPromptDraft: unifiedDesign.setPromptDraft,
    messages: unifiedDesign.messages,
    pageTargetScope: pageAi.pageAiDesign.targetScope,
    cardTargetScope: cardAi.cardAiDesign.targetScope,
    setPageTargetScope: pageAi.setTargetScope,
    setCardTargetScope: cardAi.setTargetScope,
    applyUnifiedAiDesign,
    isApplying: isCardTarget
      ? cardAi.isApplyingCardAiDesign
      : pageAi.isApplyingPageAiDesign,
    errorMessage: isCardTarget
      ? cardAi.cardAiErrorMessage
      : pageAi.pageAiErrorMessage,
    canUndoAiChanges: cardAi.canUndoCardAiDesign,
    undoAiChanges,
    cardStyle: cardAi.cardStyle,
    setCardsPerRow: cardAi.setCardsPerRow,
    saveDraft,
    status,
    selectedProductCategoryName,
  };

  return {
    status,
    errorMessage,
    hasStarted,
    currentStep,
    selectedProductCategoryName,
    previewConfig,
    previewProductRows: allProductRows,
    officeName,
    nh_name: toTrimmedString(nhName),
    startSession,
    goNext,
    goPrevious,
    productCategoryStep,
    dataSelectionStep,
    unifiedDesignStep,
  };
}
