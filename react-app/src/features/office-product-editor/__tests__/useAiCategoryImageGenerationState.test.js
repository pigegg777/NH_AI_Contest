import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAiCategoryImageGenerationState } from '../hooks/ai-category-image/useAiCategoryImageGenerationState';
import {
  buildStorefrontSavePayload,
  resolveCategoryDraft,
} from '../../storefront/model/storefront-config/storefrontBuilderModel';
import {
  fetchStorefrontConfig,
  upsertStorefrontConfig,
} from '../../storefront/model/storefront-config/storefrontConfigOrchestrator';
import { postCategoryImageRequest } from '../../storefront/services/card-design/categoryImageGateway';

vi.mock('../../storefront/model/storefront-config/storefrontBuilderModel', () => ({
  buildStorefrontSavePayload: vi.fn(),
  resolveCategoryDraft: vi.fn(),
}));

vi.mock('../../storefront/model/storefront-config/storefrontConfigOrchestrator', () => ({
  fetchStorefrontConfig: vi.fn(),
  upsertStorefrontConfig: vi.fn(),
}));

vi.mock('../../storefront/services/card-design/categoryImageGateway', () => ({
  postCategoryImageRequest: vi.fn(),
}));

const sampleRows = [
  { row_id: 'A1', medium_category: '비료', spec: '20kg' },
  { row_id: 'A2', medium_category: '비료', spec: '10kg' },
  { row_id: 'A3', medium_category: '농약', spec: '1L' },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAiCategoryImageGenerationState', () => {
  it('derives unique medium categories from rows in order of first appearance', () => {
    fetchStorefrontConfig.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useAiCategoryImageGenerationState('OFF-1', sampleRows, '농자재'),
    );

    expect(result.current.mediumCategories).toEqual(['비료', '농약']);
  });

  it('hydrates generatedCategoryImages from the matching category row on mount', async () => {
    const existingEntry = { imageDataUri: 'data:image/png;base64,abc', prompt: 'p', isAiGenerated: true };
    fetchStorefrontConfig.mockResolvedValue({
      categoryConfigs: [
        {
          productCategoryName: '농자재',
          categoryConfig: { generatedCategoryImages: { 비료: existingEntry } },
        },
      ],
    });

    const { result } = renderHook(() =>
      useAiCategoryImageGenerationState('OFF-1', sampleRows, '농자재'),
    );

    await waitFor(() => {
      expect(result.current.generatedCategoryImages).toEqual({ 비료: existingEntry });
    });
  });

  it('generates and saves a new category image', async () => {
    fetchStorefrontConfig.mockResolvedValue({ categoryConfigs: [], hiddenProducts: [] });
    postCategoryImageRequest.mockResolvedValue({
      imageDataUri: 'data:image/png;base64,xyz',
      prompt: '비료 이미지',
    });
    resolveCategoryDraft.mockReturnValue({
      selectedMediumCategories: ['비료', '농약'],
      representativeMediumCategory: '비료',
      cardStyle: {},
      cardFields: [],
      bodySlots: [],
    });
    buildStorefrontSavePayload.mockReturnValue({ officeCode: 'OFF-1', categoryConfigs: [] });
    upsertStorefrontConfig.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAiCategoryImageGenerationState('OFF-1', sampleRows, '농자재'),
    );

    await waitFor(() => expect(fetchStorefrontConfig).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.generateCategoryImage('비료', { promptOverride: '따뜻한 느낌' });
    });

    expect(postCategoryImageRequest).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      mediumCategory: '비료',
      promptOverride: '따뜻한 느낌',
      representativeProductFields: { spec: '20kg', nutrient: undefined },
    });
    expect(upsertStorefrontConfig).toHaveBeenCalledTimes(1);

    const savePayloadArg = buildStorefrontSavePayload.mock.calls[0][0];
    expect(savePayloadArg.generatedCategoryImages).toEqual({
      비료: expect.objectContaining({ imageDataUri: 'data:image/png;base64,xyz', prompt: '비료 이미지', isAiGenerated: true }),
    });

    expect(result.current.generatedCategoryImages.비료).toEqual(
      expect.objectContaining({ imageDataUri: 'data:image/png;base64,xyz' }),
    );
    expect(result.current.isGeneratingCategoryImage.비료).toBe(false);
  });

  it('records an error message and leaves generatedCategoryImages unchanged on failure', async () => {
    fetchStorefrontConfig.mockResolvedValue({ categoryConfigs: [], hiddenProducts: [] });
    postCategoryImageRequest.mockRejectedValue(new Error('이미지 생성 실패'));

    const { result } = renderHook(() =>
      useAiCategoryImageGenerationState('OFF-1', sampleRows, '농자재'),
    );

    await waitFor(() => expect(fetchStorefrontConfig).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.generateCategoryImage('비료');
    });

    expect(result.current.errorMessages.비료).toBe('이미지 생성 실패');
    expect(result.current.generatedCategoryImages.비료).toBeUndefined();
    expect(result.current.isGeneratingCategoryImage.비료).toBe(false);
    expect(upsertStorefrontConfig).not.toHaveBeenCalled();
  });
});
