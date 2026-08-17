import { useEffect, useState } from 'react';

import {
  buildStorefrontSavePayload,
  resolveCategoryDraft,
} from '../../../storefront/model/storefront-config/storefrontBuilderModel';
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from '../../../storefront/model/storefront-config/storefrontConfigOrchestrator';
import { postCategoryImageRequest } from '../../../storefront/services/card-design/categoryImageGateway';

const GENERATION_FAILED_ERROR_MESSAGE = '이미지를 생성하지 못했습니다.';

function deriveMediumCategories(rows) {
  const seen = new Set();
  const values = [];

  for (const row of Array.isArray(rows) ? rows : []) {
    const value = typeof row?.medium_category === 'string' ? row.medium_category.trim() : '';

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    values.push(value);
  }

  return values;
}

function findRepresentativeRow(rows, mediumCategory) {
  return (Array.isArray(rows) ? rows : []).find((row) => row?.medium_category === mediumCategory) ?? null;
}

// Storefront's per-office storefront page config (office_page_config) is where
// generatedCategoryImages actually lives — office-product-editor has no config of
// its own for this, so every read/write here reaches across into storefront's
// model/service layer rather than duplicating storage.
export function useAiCategoryImageGenerationState(officeCode, rows, productCategoryName) {
  const [generatedCategoryImages, setGeneratedCategoryImages] = useState({});
  const [isGeneratingCategoryImage, setIsGeneratingCategoryImage] = useState({});
  const [errorMessages, setErrorMessages] = useState({});

  const mediumCategories = deriveMediumCategories(rows);

  useEffect(() => {
    let isCancelled = false;

    if (!officeCode || !productCategoryName) {
      setGeneratedCategoryImages({});
      return undefined;
    }

    fetchStorefrontConfig({ officeCode }).then((config) => {
      if (isCancelled) {
        return;
      }

      const existingRow = (config?.categoryConfigs ?? []).find(
        (row) => row?.productCategoryName === productCategoryName,
      );

      setGeneratedCategoryImages(existingRow?.categoryConfig?.generatedCategoryImages ?? {});
    });

    return () => {
      isCancelled = true;
    };
  }, [officeCode, productCategoryName]);

  async function generateCategoryImage(mediumCategory, { promptOverride } = {}) {
    setIsGeneratingCategoryImage((current) => ({ ...current, [mediumCategory]: true }));
    setErrorMessages((current) => ({ ...current, [mediumCategory]: '' }));

    try {
      const representativeRow = findRepresentativeRow(rows, mediumCategory);
      const result = await postCategoryImageRequest({
        officeCode,
        mediumCategory,
        promptOverride: promptOverride || '',
        representativeProductFields: {
          spec: representativeRow?.spec,
          nutrient: representativeRow?.nutrient,
        },
      });

      const newEntry = {
        imageDataUri: result.imageDataUri,
        prompt: result.prompt,
        isAiGenerated: true,
        generatedAt: new Date().toISOString(),
      };

      // Re-fetch the latest saved config right before saving, rather than reusing
      // what was loaded on mount, so a concurrent edit in the storefront builder
      // (a different tab/session) doesn't get clobbered by a stale save here.
      const latestConfig = await fetchStorefrontConfig({ officeCode });
      const draft = resolveCategoryDraft({
        productCategoryName,
        productEntries: [{ categoryName: productCategoryName, rows }],
        existingConfig: latestConfig,
      });
      const payload = buildStorefrontSavePayload({
        officeCode,
        existingConfig: latestConfig,
        hiddenProducts: latestConfig?.hiddenProducts ?? [],
        selectedProductCategoryName: productCategoryName,
        selectedMediumCategories: draft.selectedMediumCategories,
        representativeMediumCategory: draft.representativeMediumCategory,
        cardStyle: draft.cardStyle,
        cardFields: draft.cardFields,
        bodySlots: draft.bodySlots,
        navConfig: latestConfig?.navConfig,
        mobileUiTree: latestConfig?.pageConfig?.mobileUiTree,
        pageStyle: latestConfig?.pageConfig?.pageStyle,
        generatedCategoryImages: { [mediumCategory]: newEntry },
      });

      await upsertStorefrontConfig(payload);

      setGeneratedCategoryImages((current) => ({ ...current, [mediumCategory]: newEntry }));

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : GENERATION_FAILED_ERROR_MESSAGE;

      setErrorMessages((current) => ({ ...current, [mediumCategory]: message }));

      return { ok: false, error: message };
    } finally {
      setIsGeneratingCategoryImage((current) => ({ ...current, [mediumCategory]: false }));
    }
  }

  return {
    mediumCategories,
    generatedCategoryImages,
    isGeneratingCategoryImage,
    errorMessages,
    generateCategoryImage,
  };
}
