import { startTransition, useEffect, useState } from 'react';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import { normalizeCardStyle } from '../model/cardStyleModel';
import { DEFAULT_STOREFRONT_EDIT_POLICY, normalizeStorefrontAiDesign } from '../model/storefrontAiDesignModel';
import {
  DEFAULT_CARD_FIELDS,
  DEFAULT_NAV_CONFIG,
  DEFAULT_PAGE_CONFIG,
  buildStorefrontSavePayload,
  deriveAvailableCategoryFields,
  deriveMediumCategoryOptions,
  deriveProductCategoryOptions,
  findCategoryConfigRow,
  flattenProductEntries,
  normalizeCardFields,
  normalizeNavConfig,
  normalizePageConfig,
  resolveCategoryDraft,
} from '../model/storefrontBuilderModel';
import {
  DEFAULT_CARD_ELEMENT_CONFIG,
  normalizeCardElementConfig,
  sanitizeMobileUiTree,
} from '../model/storefrontUiModel';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefrontConfigService';
import { requestStorefrontAiSuggestion } from '../services/storefrontAiService';
import { usePageAiDesign } from './usePageAiDesign';

const FETCH_ERROR_MESSAGE = 'We could not load the storefront builder.';
const SAVE_ERROR_MESSAGE = 'We could not save the storefront draft.';
const FINAL_STEP_INDEX = 1;
const CARD_ELEMENT_FIELD_MAP = {
  showProductName: 'product_name',
  showSpec: 'spec',
  showNutrient: 'nutrient',
  showPrice: 'tax_price',
};

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
  const [hasStarted, setHasStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [productEntries, setProductEntries] = useState([]);
  const [existingConfig, setExistingConfig] = useState(null);
  const [hiddenProducts, setHiddenProducts] = useState([]);
  const [selectedProductCategoryName, setSelectedProductCategoryName] = useState('');
  const [selectedMediumCategories, setSelectedMediumCategories] = useState([]);
  const [representativeMediumCategory, setRepresentativeMediumCategory] = useState('');
  const pageAi = usePageAiDesign();
  const [cardStyle, setCardStyleState] = useState(() => normalizeCardStyle());
  const [cardFields, setCardFields] = useState(DEFAULT_CARD_FIELDS);
  const [cardElementConfig, setCardElementConfig] = useState(DEFAULT_CARD_ELEMENT_CONFIG);
  const [cardTemplate, setCardTemplateState] = useState('card-grid');
  const [navConfig, setNavConfig] = useState(DEFAULT_NAV_CONFIG);
  const [mobileUiTree, setMobileUiTree] = useState(() => sanitizeMobileUiTree(DEFAULT_PAGE_CONFIG.mobileUiTree));
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiChangeSummary, setAiChangeSummary] = useState([]);
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [aiDesign, setAiDesign] = useState(null);
  const [isAiApplying, setIsAiApplying] = useState(false);
  const [lastAiSnapshot, setLastAiSnapshot] = useState(null);

  const allProductRows = flattenProductEntries(productEntries);
  const currentEntry = productEntries.find((entry) => entry?.categoryName === selectedProductCategoryName) ?? null;
  const mediumCategoryOptions = deriveMediumCategoryOptions(currentEntry?.rows);
  const productCategoryOptions = deriveProductCategoryOptions(productEntries, existingConfig);
  const availableCategoryFields = deriveAvailableCategoryFields(currentEntry?.rows);
  const availableScalarKeys = availableCategoryFields.filter((f) => f.isSelectable).map((f) => f.key);
  const effectiveScalarKeys = availableScalarKeys.length > 0 ? availableScalarKeys : undefined;

  function markDirty() {
    setStatus((current) => (current === 'saved' ? 'ready' : current));
  }

  function hydrateCategoryDraft(categoryName, nextProductEntries, nextExistingConfig) {
    const resolvedCategoryName = categoryName || '';
    const resolvedDraft = resolveCategoryDraft({
      productCategoryName: resolvedCategoryName,
      productEntries: nextProductEntries,
      existingConfig: nextExistingConfig,
    });

    setSelectedProductCategoryName(resolvedCategoryName);
    setSelectedMediumCategories(resolvedDraft.selectedMediumCategories);
    setRepresentativeMediumCategory(resolvedDraft.representativeMediumCategory);
    setCardFields(resolvedDraft.cardFields);
    setCardStyleState(resolvedDraft.cardStyle);
    setCardElementConfig(resolvedDraft.cardElementConfig);
    setCardTemplateState(resolvedDraft.cardTemplate);
    setAiDesign(resolvedDraft.aiDesign);
  }

  useEffect(() => {
    let isCancelled = false;

    setStatus('loading');
    setErrorMessage('');
    setHasStarted(false);
    setCurrentStep(0);

    Promise.all([fetchOfficeProductDataEntries({ officeCode }), fetchStorefrontConfig({ officeCode })])
      .then(([nextProductEntries, config]) => {
        if (isCancelled) {
          return;
        }

        const normalizedPageConfig = normalizePageConfig(config?.pageConfig);
        const nextCategoryName = getInitialCategoryName(nextProductEntries, config);

        setProductEntries(nextProductEntries);
        setExistingConfig(config);
        setHiddenProducts(config?.hiddenProducts ?? []);
        pageAi.hydratePageStyle(normalizedPageConfig.pageStyle);
        setMobileUiTree(sanitizeMobileUiTree(normalizedPageConfig.mobileUiTree));
        setNavConfig(
          normalizeNavConfig({
            title: config?.navConfig?.title ?? normalizedPageConfig.nav.title,
            subtitle: config?.navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
            brandColor: config?.navConfig?.brandColor ?? normalizedPageConfig.theme.brandColor,
            searchPlaceholder:
              config?.navConfig?.searchPlaceholder ?? normalizedPageConfig.searchSection.placeholder,
            logoUrl: config?.navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
            searchVariant: config?.navConfig?.searchVariant ?? normalizedPageConfig.searchSection.variant,
            categoryChipVariant:
              config?.navConfig?.categoryChipVariant ?? normalizedPageConfig.categoryChips.variant,
          }),
        );
        hydrateCategoryDraft(nextCategoryName, nextProductEntries, config);
        setAiPrompt('');
        setAiSummary('');
        setAiChangeSummary([]);
        setAiErrorMessage('');
        setLastAiSnapshot(null);
        setStatus('ready');
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : FETCH_ERROR_MESSAGE);
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
    markDirty();
    hydrateCategoryDraft(categoryName, productEntries, existingConfig);
  }

  function toggleCardField(field) {
    markDirty();
    setAiDesign(null);
    setCardFields((current) => {
      const nextFields = current.includes(field) ? current.filter((value) => value !== field) : [...current, field];
      const normalizedFields = normalizeCardFields(nextFields, effectiveScalarKeys);
      const cardElementKey = Object.keys(CARD_ELEMENT_FIELD_MAP).find((key) => CARD_ELEMENT_FIELD_MAP[key] === field);

      if (cardElementKey) {
        setCardElementConfig((currentConfig) =>
          normalizeCardElementConfig({
            ...currentConfig,
            [cardElementKey]: normalizedFields.includes(field),
          }),
        );
      }

      return normalizedFields;
    });
  }

  function undoAiChanges() {
    if (!lastAiSnapshot) {
      return;
    }

    markDirty();
    setSelectedMediumCategories(lastAiSnapshot.selectedMediumCategories);
    setRepresentativeMediumCategory(lastAiSnapshot.representativeMediumCategory);
    setCardFields(lastAiSnapshot.cardFields);
    setCardTemplateState(lastAiSnapshot.cardTemplate);
    setCardStyleState(lastAiSnapshot.cardStyle);
    setCardElementConfig(lastAiSnapshot.cardElementConfig);
    setNavConfig(lastAiSnapshot.navConfig);
    setMobileUiTree(lastAiSnapshot.mobileUiTree);
    setAiDesign(lastAiSnapshot.aiDesign);
    setAiSummary(lastAiSnapshot.aiSummary);
    setAiChangeSummary(lastAiSnapshot.aiChangeSummary);
    setLastAiSnapshot(null);
  }

  function goNext() {
    setCurrentStep((current) => Math.min(current + 1, FINAL_STEP_INDEX));
  }

  function goPrevious() {
    setCurrentStep((current) => Math.max(current - 1, 0));
  }

  async function applyAiSuggestion() {
    setIsAiApplying(true);
    setAiErrorMessage('');

    try {
      const suggestion = await requestStorefrontAiSuggestion({
        prompt: aiPrompt,
        mediumCategoryOptions,
        fieldCatalog: availableCategoryFields,
        editPolicy: DEFAULT_STOREFRONT_EDIT_POLICY,
        currentDraft: {
          productCategoryName: selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          cardFields,
          cardStyle,
          cardElementConfig,
          cardTemplate,
          navConfig,
          mobileUiTree,
          aiDesign,
        },
        allowedScalarKeys: effectiveScalarKeys,
      });

      const nextAiDesign = normalizeStorefrontAiDesign(
        {
          prompt: aiPrompt,
          activeSkillIds: suggestion.activeSkillIds,
          designPlan: suggestion.designPlan,
          renderSpec: suggestion.renderSpec,
        },
        effectiveScalarKeys,
      );

      const snapshot = {
        selectedMediumCategories,
        representativeMediumCategory,
        cardFields,
        cardStyle,
        cardElementConfig,
        cardTemplate,
        navConfig,
        mobileUiTree,
        aiDesign,
        aiSummary,
        aiChangeSummary,
      };

      startTransition(() => {
        const nextMediumCategories =
          suggestion.patch.selectedMediumCategories.length > 0
            ? suggestion.patch.selectedMediumCategories
            : selectedMediumCategories;

        setHasStarted(true);
        setCurrentStep(FINAL_STEP_INDEX);
        setLastAiSnapshot(snapshot);
        setSelectedMediumCategories(nextMediumCategories);
        setRepresentativeMediumCategory(
          suggestion.patch.representativeMediumCategory || nextMediumCategories[0] || representativeMediumCategory,
        );
        setCardFields(normalizeCardFields(suggestion.patch.cardFields, effectiveScalarKeys));
        setCardTemplateState(suggestion.patch.cardTemplate);
        setCardStyleState(normalizeCardStyle(suggestion.patch.cardStyle));
        setCardElementConfig(normalizeCardElementConfig(suggestion.patch.cardElementConfig));
        setNavConfig(normalizeNavConfig({ ...navConfig, ...suggestion.patch.navConfig }));
        setMobileUiTree(sanitizeMobileUiTree(suggestion.patch.mobileUiTree));
        setAiDesign(nextAiDesign);
        setAiSummary(suggestion.summary);
        setAiChangeSummary(suggestion.patch.uiChangeSummary ?? []);
      });
    } catch (error) {
      setAiErrorMessage(error instanceof Error ? error.message : 'We could not apply the AI draft.');
    } finally {
      setIsAiApplying(false);
    }
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
        cardStyle,
        cardFields,
        cardElementConfig,
        navConfig,
        mobileUiTree,
        cardTemplate,
        aiDesign,
        pageStyle: pageAi.pageStyle,
        allowedScalarKeys: effectiveScalarKeys,
      });

      await upsertStorefrontConfig(payload);
      setExistingConfig(payload);
      setHiddenProducts(payload.hiddenProducts);
      setStatus('saved');
      pageAi.discardPageAiDesignSession();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : SAVE_ERROR_MESSAGE);
      setStatus('save-error');
    }
  }

  const previewConfig =
    selectedProductCategoryName
      ? buildStorefrontSavePayload({
          officeCode,
          existingConfig,
          hiddenProducts,
          selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          cardStyle,
          cardFields,
          cardElementConfig,
          navConfig,
          mobileUiTree,
          cardTemplate,
          aiDesign,
          pageStyle: pageAi.pageStyle,
          allowedScalarKeys: effectiveScalarKeys,
        })
      : {
          officeCode,
          pageConfig: normalizePageConfig({ ...existingConfig?.pageConfig, pageStyle: pageAi.pageStyle }),
          navConfig: normalizeNavConfig(existingConfig?.navConfig),
          categoryConfigs: existingConfig?.categoryConfigs ?? [],
          hiddenProducts,
        };

  return {
    status,
    errorMessage,
    hasStarted,
    currentStep,
    productCategoryOptions,
    selectedProductCategoryName,
    currentEntry,
    availableCategoryFields,
    selectedMediumCategories,
    representativeMediumCategory,
    cardFields,
    aiPrompt,
    aiSummary,
    aiChangeSummary,
    aiErrorMessage,
    isAiApplying,
    previewConfig,
    previewProductRows: allProductRows,
    pageStyle: pageAi.pageStyle,
    pageAiDesign: pageAi.pageAiDesign,
    isApplyingPageAiDesign: pageAi.isApplyingPageAiDesign,
    pageAiErrorMessage: pageAi.pageAiErrorMessage,
    setPageMainPrompt: pageAi.setMainPrompt,
    setPageHeaderOverridePrompt: pageAi.setHeaderOverridePrompt,
    setPageCategoryChipsOverridePrompt: pageAi.setCategoryChipsOverridePrompt,
    setPageSearchOverridePrompt: pageAi.setSearchOverridePrompt,
    applyPageAiDesign: pageAi.applyPageAiDesign,
    setAiPrompt,
    startSession,
    selectProductCategory,
    toggleCardField,
    undoAiChanges,
    goNext,
    goPrevious,
    applyAiSuggestion,
    saveDraft,
  };
}
