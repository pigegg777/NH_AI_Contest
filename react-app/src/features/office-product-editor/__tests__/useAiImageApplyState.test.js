import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAiImageApplyState } from '../hooks/ai-image-apply/useAiImageApplyState';
import { analyzeAiImageApplyMatches } from '../model/ai-image-apply/aiImageApplyAnalysisModel';
import {
  requestAiImageDelete,
  requestAiImageGenerate,
  requestAiImageList,
  requestAiImageUpload,
} from '../services/ai-image-apply/aiImageApplyClient';

vi.mock('../model/ai-image-apply/aiImageApplyAnalysisModel', () => ({
  analyzeAiImageApplyMatches: vi.fn(),
}));

vi.mock('../services/ai-image-apply/aiImageApplyClient', () => ({
  requestAiImageGenerate: vi.fn(),
  requestAiImageUpload: vi.fn(),
  requestAiImageList: vi.fn(),
  requestAiImageDelete: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAiImageApplyState', () => {
  it('generates a preview image via the AI generate endpoint', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.previewImage).toEqual({
      kind: 'generated',
      imageDataUri: 'data:image/png;base64,abc',
      previewUrl: 'data:image/png;base64,abc',
      storageUrl: null,
    });
  });

  it('surfaces a generation error message', async () => {
    requestAiImageGenerate.mockRejectedValue(new Error('OpenAI request failed'));
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });

    expect(result.current.previewImage).toBeNull();
    expect(result.current.previewError).toBe('OpenAI request failed');
  });

  it('rejects a file with a disallowed type', () => {
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    act(() => {
      result.current.handleSelectFile({ type: 'application/pdf', size: 100 });
    });

    expect(result.current.previewImage).toBeNull();
    expect(result.current.previewError).toBe('PNG, JPEG, WEBP 이미지만 업로드할 수 있습니다.');
  });

  it('rejects a file larger than the size limit', () => {
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    act(() => {
      result.current.handleSelectFile({ type: 'image/png', size: 10 * 1024 * 1024 });
    });

    expect(result.current.previewImage).toBeNull();
    expect(result.current.previewError).toBe('이미지는 5MB 이하만 업로드할 수 있습니다.');
  });

  it('uploads a selected file straight to storage without creating an apply-ready preview', async () => {
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/uploaded.png' });
    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleSelectFile(file);
    });

    expect(requestAiImageUpload).toHaveBeenCalledWith(
      expect.objectContaining({ officeCode: 'OFF-1' }),
    );
    expect(result.current.previewImage).toBeNull();
    expect(result.current.isUploadingFile).toBe(false);
    expect(result.current.uploadSuccessMessage).toContain('저장소에서 선택');
  });

  it('surfaces an upload error without creating a preview', async () => {
    requestAiImageUpload.mockRejectedValue(new Error('Image upload request failed'));
    const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' });

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleSelectFile(file);
    });

    expect(result.current.previewImage).toBeNull();
    expect(result.current.previewError).toBe('Image upload request failed');
    expect(result.current.uploadSuccessMessage).toBe('');
  });

  it('saves a generated preview to storage on handleSaveGeneratedImage, without applying it to any rows', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/img.png' });
    const updateImgUrl = vi.fn();

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });

    expect(result.current.previewImage.storageUrl).toBeNull();

    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });

    expect(requestAiImageUpload).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      imageDataUri: 'data:image/png;base64,abc',
    });
    expect(result.current.previewImage.storageUrl).toBe('https://example.com/img.png');
    expect(result.current.isSavingImage).toBe(false);
    expect(updateImgUrl).not.toHaveBeenCalled();
  });

  it('surfaces a save error when the storage upload fails', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockRejectedValue(new Error('Image upload request failed'));

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });

    expect(result.current.previewImage.storageUrl).toBeNull();
    expect(result.current.previewError).toBe('Image upload request failed');
    expect(result.current.isSavingImage).toBe(false);
  });

  it('refuses to apply a generated image that has not been saved to storage yet', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    const updateImgUrl = vi.fn();

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 적용해줘');
    });

    expect(requestAiImageUpload).not.toHaveBeenCalled();
    expect(analyzeAiImageApplyMatches).not.toHaveBeenCalled();
    expect(updateImgUrl).not.toHaveBeenCalled();
    expect(result.current.applyErrorMessage).toBe('먼저 이미지를 저장소에 저장해 주세요.');
  });

  it('applies the saved image URL to every matched row once the preview has been saved', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/img.png' });
    analyzeAiImageApplyMatches.mockResolvedValue({
      mode: 'openai',
      rowIds: ['A100__01', 'B200__01'],
      unmatchedReason: null,
    });
    const updateImgUrl = vi.fn();

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });
    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 적용해줘');
    });

    expect(updateImgUrl).toHaveBeenCalledTimes(2);
    expect(updateImgUrl).toHaveBeenNthCalledWith(1, 'A100__01', 'https://example.com/img.png');
    expect(updateImgUrl).toHaveBeenNthCalledWith(2, 'B200__01', 'https://example.com/img.png');
    expect(result.current.appliedCount).toBe(2);
  });

  it('does not re-upload once a preview has already been saved, no matter how many times it is applied', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/img.png' });
    analyzeAiImageApplyMatches.mockResolvedValue({ mode: 'openai', rowIds: ['A100__01'], unmatchedReason: null });
    const updateImgUrl = vi.fn();

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });
    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 적용해줘');
    });
    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 다시 적용해줘');
    });

    expect(requestAiImageUpload).toHaveBeenCalledTimes(1);
  });

  it('excludes rows locked by a static fertilizer image from being applied, even if the AI matched them', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/img.png' });
    analyzeAiImageApplyMatches.mockResolvedValue({
      mode: 'openai',
      rowIds: ['A100__01', 'B200__01'],
      unmatchedReason: null,
    });
    const updateImgUrl = vi.fn();
    const rows = [
      { row_id: 'A100__01', img_url_is_static: true },
      { row_id: 'B200__01', img_url_is_static: false },
    ];

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', rows, updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });
    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 적용해줘');
    });

    expect(updateImgUrl).toHaveBeenCalledTimes(1);
    expect(updateImgUrl).toHaveBeenCalledWith('B200__01', 'https://example.com/img.png');
    expect(result.current.matchedRowIds).toEqual(['B200__01']);
    expect(result.current.appliedCount).toBe(1);
  });

  it('applies nothing when every AI-matched row is locked by a static fertilizer image', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/img.png' });
    analyzeAiImageApplyMatches.mockResolvedValue({
      mode: 'openai',
      rowIds: ['A100__01'],
      unmatchedReason: null,
    });
    const updateImgUrl = vi.fn();
    const rows = [{ row_id: 'A100__01', img_url_is_static: true }];

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', rows, updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });
    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 적용해줘');
    });

    expect(updateImgUrl).not.toHaveBeenCalled();
    expect(result.current.matchedRowIds).toEqual([]);
    expect(result.current.appliedCount).toBe(0);
  });

  it('shows the unmatched reason without applying when no rows match', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    requestAiImageUpload.mockResolvedValue({ imageUrl: 'https://example.com/img.png' });
    analyzeAiImageApplyMatches.mockResolvedValue({
      mode: 'openai',
      rowIds: [],
      unmatchedReason: '조건에 맞는 상품을 찾지 못했습니다.',
    });
    const updateImgUrl = vi.fn();

    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], updateImgUrl));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    await act(async () => {
      await result.current.handleSaveGeneratedImage();
    });
    await act(async () => {
      await result.current.handleApplyRequest('없는 분류에 적용해줘');
    });

    expect(updateImgUrl).not.toHaveBeenCalled();
    expect(result.current.appliedCount).toBe(0);
    expect(result.current.unmatchedReason).toBe('조건에 맞는 상품을 찾지 못했습니다.');
  });

  it('requires a preview image before applying', async () => {
    const updateImgUrl = vi.fn();
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], updateImgUrl));

    await act(async () => {
      await result.current.handleApplyRequest('복합비료에 적용해줘');
    });

    expect(updateImgUrl).not.toHaveBeenCalled();
    expect(result.current.applyErrorMessage).toBe('먼저 이미지를 업로드하거나 생성해 주세요.');
  });

  it('clears the preview and result state on handleClearPreview', async () => {
    requestAiImageGenerate.mockResolvedValue({ imageDataUri: 'data:image/png;base64,abc', prompt: 'p' });
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleGenerateImage('복합비료 이미지');
    });
    act(() => {
      result.current.handleClearPreview();
    });

    expect(result.current.previewImage).toBeNull();
  });

  it('loads the office storage images when the browser is opened', async () => {
    requestAiImageList.mockResolvedValue({
      images: [
        { path: 'OFF-1/a.png', url: 'https://example.com/a.png', createdAt: '2026-08-19T00:00:00Z' },
      ],
    });
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleOpenStorageBrowser();
    });

    expect(requestAiImageList).toHaveBeenCalledWith({ officeCode: 'OFF-1' });
    expect(result.current.isStorageBrowserOpen).toBe(true);
    expect(result.current.isLoadingStorageImages).toBe(false);
    expect(result.current.storageImages).toEqual([
      { path: 'OFF-1/a.png', url: 'https://example.com/a.png', createdAt: '2026-08-19T00:00:00Z' },
    ]);
  });

  it('surfaces a storage list error', async () => {
    requestAiImageList.mockRejectedValue(new Error('목록을 불러오지 못했습니다.'));
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleOpenStorageBrowser();
    });

    expect(result.current.storageListError).toBe('목록을 불러오지 못했습니다.');
    expect(result.current.storageImages).toEqual([]);
  });

  it('closes the storage browser', async () => {
    requestAiImageList.mockResolvedValue({ images: [] });
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleOpenStorageBrowser();
    });
    act(() => {
      result.current.handleCloseStorageBrowser();
    });

    expect(result.current.isStorageBrowserOpen).toBe(false);
  });

  it('selects a storage image as the preview without re-uploading it', async () => {
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    act(() => {
      result.current.handleSelectStorageImage({ path: 'OFF-1/a.png', url: 'https://example.com/a.png' });
    });

    expect(result.current.previewImage).toEqual({
      kind: 'storage',
      previewUrl: 'https://example.com/a.png',
      storageUrl: 'https://example.com/a.png',
    });
    expect(result.current.isStorageBrowserOpen).toBe(false);
  });

  it('deletes a storage image, removing it from the list', async () => {
    requestAiImageList.mockResolvedValue({
      images: [
        { path: 'OFF-1/a.png', url: 'https://example.com/a.png', createdAt: '2026-08-19T00:00:00Z' },
        { path: 'OFF-1/b.png', url: 'https://example.com/b.png', createdAt: '2026-08-18T00:00:00Z' },
      ],
    });
    requestAiImageDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    await act(async () => {
      await result.current.handleOpenStorageBrowser();
    });
    await act(async () => {
      await result.current.handleDeleteStorageImage({ path: 'OFF-1/a.png', url: 'https://example.com/a.png' });
    });

    expect(requestAiImageDelete).toHaveBeenCalledWith({ officeCode: 'OFF-1', path: 'OFF-1/a.png' });
    expect(result.current.storageImages).toEqual([
      { path: 'OFF-1/b.png', url: 'https://example.com/b.png', createdAt: '2026-08-18T00:00:00Z' },
    ]);
  });

  it('clears the preview when the currently selected image is deleted', async () => {
    requestAiImageList.mockResolvedValue({
      images: [{ path: 'OFF-1/a.png', url: 'https://example.com/a.png', createdAt: '2026-08-19T00:00:00Z' }],
    });
    requestAiImageDelete.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAiImageApplyState('OFF-1', [], vi.fn()));

    act(() => {
      result.current.handleSelectStorageImage({ path: 'OFF-1/a.png', url: 'https://example.com/a.png' });
    });
    await act(async () => {
      await result.current.handleDeleteStorageImage({ path: 'OFF-1/a.png', url: 'https://example.com/a.png' });
    });

    expect(result.current.previewImage).toBeNull();
  });
});
