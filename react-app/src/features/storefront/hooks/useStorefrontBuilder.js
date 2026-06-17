import { startTransition, useEffect, useState } from 'react';

import { fetchOfficeProductDataEntries } from '../../office-product-editor/services/officeProductDataService';
import { normalizeCardStyle } from '../model/cardStyleModel';
import {
  DEFAULT_CARD_FIELDS,
  DEFAULT_NAV_CONFIG,
  DEFAULT_PAGE_CONFIG,
  buildStorefrontSavePayload,
  deriveMediumCategoryOptions,
  deriveProductCategoryOptions,
  findCategoryConfigRow,
  flattenProductEntries,
  normalizeCardFields,
  normalizeNavConfig,
  normalizePageConfig,
  resolveCategoryDraft,
} from '../model/storefrontBuilderModel';
import { fetchStorefrontConfig, upsertStorefrontConfig } from '../services/storefrontConfigService';
import { requestStorefrontAiSuggestion } from '../services/storefrontAiService';

const FETCH_ERROR_MESSAGE = 'We could not load the storefront builder.';
const SAVE_ERROR_MESSAGE = 'We could not save the storefront draft.';
const FINAL_STEP_INDEX = 1;

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
  const [designDirection, setDesignDirectionState] = useState(DEFAULT_PAGE_CONFIG.designDirection);
  const [cardStyle, setCardStyleState] = useState(() => normalizeCardStyle());
  const [cardFields, setCardFields] = useState(DEFAULT_CARD_FIELDS);
  const [navConfig, setNavConfig] = useState(DEFAULT_NAV_CONFIG);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiErrorMessage, setAiErrorMessage] = useState('');
  const [isAiApplying, setIsAiApplying] = useState(false);

  const allProductRows = flattenProductEntries(productEntries);
  const currentEntry = productEntries.find(
    (entry) => entry?.categoryName === selectedProductCategoryName,
  ) ?? null;
  const mediumCategoryOptions = deriveMediumCategoryOptions(currentEntry?.rows);
  const productCategoryOptions = deriveProductCategoryOptions(productEntries, existingConfig);

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
        setDesignDirectionState(normalizedPageConfig.designDirection);
        setNavConfig(
          normalizeNavConfig({
            title: config?.navConfig?.title ?? normalizedPageConfig.nav.title,
            subtitle: config?.navConfig?.subtitle ?? normalizedPageConfig.nav.subtitle,
            brandColor: config?.navConfig?.brandColor ?? normalizedPageConfig.theme.brandColor,
            searchPlaceholder:
              config?.navConfig?.searchPlaceholder ?? normalizedPageConfig.searchSection.placeholder,
            logoUrl: config?.navConfig?.logoUrl ?? normalizedPageConfig.nav.logoUrl,
            searchVariant:
              config?.navConfig?.searchVariant ?? normalizedPageConfig.searchSection.variant,
            categoryChipVariant:
              config?.navConfig?.categoryChipVariant ?? normalizedPageConfig.categoryChips.variant,
          }),
        );
        hydrateCategoryDraft(nextCategoryName, nextProductEntries, config);
        setAiPrompt('');
        setAiSummary('');
        setAiErrorMessage('');
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

  function toggleMediumCategory(mediumCategory) {
    markDirty();
    setSelectedMediumCategories((current) => {
      const alreadySelected = current.includes(mediumCategory);
      const nextMediumCategories = alreadySelected
        ? current.filter((value) => value !== mediumCategory)
        : [...current, mediumCategory];

      if (!nextMediumCategories.includes(representativeMediumCategory)) {
        setRepresentativeMediumCategory(nextMediumCategories[0] || '');
      }

      return nextMediumCategories;
    });
  }

  function selectRepresentativeMediumCategory(mediumCategory) {
    markDirty();
    setRepresentativeMediumCategory(mediumCategory);
    setSelectedMediumCategories((current) =>
      current.includes(mediumCategory) ? current : [mediumCategory, ...current],
    );
  }

  function setDesignDirection(value) {
    markDirty();
    setDesignDirectionState(value);
  }

  function setCardStyle(key, value) {
    markDirty();
    setCardStyleState((current) => normalizeCardStyle({ ...current, [key]: value }));
  }

  function toggleCardField(field) {
    markDirty();
    setCardFields((current) => {
      const nextFields = current.includes(field) ? current.filter((value) => value !== field) : [...current, field];
      return normalizeCardFields(nextFields);
    });
  }

  function updateNavField(key, value) {
    markDirty();
    setNavConfig((current) => normalizeNavConfig({ ...current, [key]: value }));
  }

  function applyPromptSuggestion(promptSuggestion) {
    const nextSuggestion = String(promptSuggestion || '').trim();

    if (!nextSuggestion) {
      return;
    }

    setAiPrompt((current) => {
      const trimmedCurrent = current.trim();

      if (!trimmedCurrent) {
        return nextSuggestion;
      }

      if (trimmedCurrent.toLowerCase().includes(nextSuggestion.toLowerCase())) {
        return current;
      }

      return `${trimmedCurrent} ${nextSuggestion}`;
    });
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
        currentDraft: {
          productCategoryName: selectedProductCategoryName,
          selectedMediumCategories,
          representativeMediumCategory,
          designDirection,
          cardFields,
          cardStyle,
          navConfig,
        },
      });

      startTransition(() => {
        const nextMediumCategories =
          suggestion.patch.selectedMediumCategories.length > 0
            ? suggestion.patch.selectedMediumCategories
            : selectedMediumCategories;

        setHasStarted(true);
        setCurrentStep(FINAL_STEP_INDEX);
        setDesignDirectionState(suggestion.patch.designDirection || designDirection);
        setSelectedMediumCategories(nextMediumCategories);
        setRepresentativeMediumCategory(
          suggestion.patch.representativeMediumCategory || nextMediumCategories[0] || representativeMediumCategory,
        );
        setCardFields(normalizeCardFields(suggestion.patch.cardFields));
        setCardStyleState(normalizeCardStyle(suggestion.patch.cardStyle));
        setNavConfig(normalizeNavConfig({ ...navConfig, ...suggestion.patch.navConfig }));
        setAiSummary(suggestion.summary);
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
        navConfig,
        designDirection,
      });

      await upsertStorefrontConfig(payload);
      setExistingConfig(payload);
      setHiddenProducts(payload.hiddenProducts);
      setStatus('saved');
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
          navConfig,
          designDirection,
        })
      : {
          officeCode,
          pageConfig: normalizePageConfig(existingConfig?.pageConfig),
          navConfig: normalizeNavConfig(existingConfig?.navConfig),
          categoryConfigs: existingConfig?.categoryConfigs ?? [],
          hiddenProducts,
        };

  return {
    status,
    errorMessage,
    hasStarted,
    currentStep,
    productEntries,
    productCategoryOptions,
    selectedProductCategoryName,
    currentEntry,
    mediumCategoryOptions,
    selectedMediumCategories,
    representativeMediumCategory,
    designDirection,
    cardStyle,
    cardFields,
    navConfig,
    aiPrompt,
    aiSummary,
    aiErrorMessage,
    isAiApplying,
    previewConfig,
    previewProductRows: allProductRows,
    setAiPrompt,
    startSession,
    selectProductCategory,
    toggleMediumCategory,
    selectRepresentativeMediumCategory,
    setDesignDirection,
    setCardStyle,
    toggleCardField,
    updateNavField,
    applyPromptSuggestion,
    goNext,
    goPrevious,
    applyAiSuggestion,
    saveDraft,
  };
}
