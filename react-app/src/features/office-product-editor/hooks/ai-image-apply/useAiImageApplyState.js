import { useRef, useState } from 'react';
import { analyzeAiImageApplyMatches } from '../../model/ai-image-apply/aiImageApplyAnalysisModel';
import {
  AI_IMAGE_UPLOAD_ERROR,
  deleteAiImage,
  generateAiImage,
  listAiImages,
  readImageFileAsDataUri,
  uploadAiImage,
  validateUploadableImageFile,
} from '../../model/ai-image-apply/aiImageStorageModel';

const UPLOAD_ERROR_MESSAGES = {
  [AI_IMAGE_UPLOAD_ERROR.UNSUPPORTED_TYPE]: () =>
    'PNG, JPEG, WEBP 이미지만 업로드할 수 있습니다.',
  [AI_IMAGE_UPLOAD_ERROR.TOO_LARGE]: (maxBytes) =>
    `이미지는 ${Math.round(maxBytes / 1024 / 1024)}MB 이하만 업로드할 수 있습니다.`,
  [AI_IMAGE_UPLOAD_ERROR.UNREADABLE]: () => '파일을 읽을 수 없습니다.',
};

export function useAiImageApplyState(officeCode, rows, updateImgUrl) {
  const [previewImage, setPreviewImage] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [mode, setMode] = useState('idle');
  const [matchedRowIds, setMatchedRowIds] = useState([]);
  const [unmatchedReason, setUnmatchedReason] = useState(null);
  const [applyErrorMessage, setApplyErrorMessage] = useState('');
  const [appliedCount, setAppliedCount] = useState(0);
  const [isStorageBrowserOpen, setIsStorageBrowserOpen] = useState(false);
  const [storageImages, setStorageImages] = useState([]);
  const [isLoadingStorageImages, setIsLoadingStorageImages] = useState(false);
  const [storageListError, setStorageListError] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [isSavingImage, setIsSavingImage] = useState(false);
  const requestIdRef = useRef(0);

  function resetResult() {
    setMode('idle');
    setMatchedRowIds([]);
    setUnmatchedReason(null);
    setApplyErrorMessage('');
    setAppliedCount(0);
  }

  // Uploading only ever puts the file into storage — it never becomes an
  // apply-ready previewImage. Registering an image onto product rows must
  // go through handleSelectStorageImage ("저장소에서 선택"), so every image
  // that ever reaches a row's img_url was deliberately picked from the
  // storage library, not whatever happened to be picked in the file dialog.
  async function handleSelectFile(file) {
    if (!file) {
      return;
    }

    const validation = validateUploadableImageFile(file);

    if (validation) {
      setPreviewError(UPLOAD_ERROR_MESSAGES[validation.error](validation.maxBytes));
      return;
    }

    setPreviewError('');
    setUploadSuccessMessage('');
    setIsUploadingFile(true);

    try {
      const imageDataUri = await readImageFileAsDataUri(file);
      await uploadAiImage({ officeCode, imageDataUri });
      setUploadSuccessMessage('업로드 완료. "저장소에서 선택"에서 골라 적용하세요.');
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : '이미지를 업로드하지 못했습니다.');
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function handleGenerateImage(prompt) {
    const trimmedPrompt = (prompt || '').trim();

    if (!trimmedPrompt) {
      return;
    }

    setPreviewError('');
    setUploadSuccessMessage('');
    setIsGenerating(true);
    resetResult();

    try {
      const imageDataUri = await generateAiImage({ officeCode, prompt: trimmedPrompt });
      setPreviewImage({
        kind: 'generated',
        imageDataUri,
        previewUrl: imageDataUri,
        storageUrl: null,
      });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : '이미지를 생성하지 못했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleClearPreview() {
    setPreviewImage(null);
    setPreviewError('');
    setUploadSuccessMessage('');
    resetResult();
  }

  // A generated preview only ever reaches storage when this is called
  // explicitly — never as a side effect of applying. An uploaded file
  // never becomes a previewImage at all (see handleSelectFile), and a
  // storage-picked image already carries its storageUrl from selection, so
  // this only ever has real work to do for a fresh 'generated' preview.
  async function handleSaveGeneratedImage() {
    if (!previewImage || previewImage.storageUrl) {
      return;
    }

    const targetPreviewImage = previewImage;
    setPreviewError('');
    setIsSavingImage(true);

    try {
      const imageUrl = await uploadAiImage({
        officeCode,
        imageDataUri: targetPreviewImage.imageDataUri,
      });

      setPreviewImage((current) =>
        current && current === targetPreviewImage ? { ...current, storageUrl: imageUrl } : current,
      );
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : '이미지를 저장하지 못했습니다.');
    } finally {
      setIsSavingImage(false);
    }
  }

  async function handleApplyRequest(instruction) {
    if (!previewImage) {
      setApplyErrorMessage('먼저 이미지를 업로드하거나 생성해 주세요.');
      return;
    }

    if (!previewImage.storageUrl) {
      setApplyErrorMessage('먼저 이미지를 저장소에 저장해 주세요.');
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsApplying(true);
    setApplyErrorMessage('');
    setAppliedCount(0);

    try {
      const imageUrl = previewImage.storageUrl;
      const result = await analyzeAiImageApplyMatches(rows, { officeCode, instruction });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setMode(result.mode);
      setUnmatchedReason(result.unmatchedReason ?? null);

      if (result.mode === 'error') {
        setApplyErrorMessage(result.message || '이미지 적용 요청에 실패했습니다.');
        setMatchedRowIds([]);
        return;
      }

      // Rows currently showing a static fertilizer default image are locked
      // (see staticFertilizerMergeModel/img_url_is_static) — never let the
      // AI's match, however it interpreted the instruction, overwrite them.
      const lockedRowIds = new Set(
        rows.filter((row) => row.img_url_is_static === true).map((row) => row.row_id),
      );
      const applicableRowIds = result.rowIds.filter((rowId) => !lockedRowIds.has(rowId));

      setMatchedRowIds(applicableRowIds);

      if (applicableRowIds.length === 0) {
        return;
      }

      applicableRowIds.forEach((rowId) => updateImgUrl(rowId, imageUrl));
      setAppliedCount(applicableRowIds.length);
    } catch (error) {
      setApplyErrorMessage(error instanceof Error ? error.message : '이미지를 적용하지 못했습니다.');
    } finally {
      if (requestIdRef.current === requestId) {
        setIsApplying(false);
      }
    }
  }

  async function handleOpenStorageBrowser() {
    setIsStorageBrowserOpen(true);
    setIsLoadingStorageImages(true);
    setStorageListError('');

    try {
      setStorageImages(await listAiImages(officeCode));
    } catch (error) {
      setStorageListError(
        error instanceof Error ? error.message : '이미지 목록을 불러오지 못했습니다.',
      );
      setStorageImages([]);
    } finally {
      setIsLoadingStorageImages(false);
    }
  }

  function handleCloseStorageBrowser() {
    setIsStorageBrowserOpen(false);
  }

  function handleSelectStorageImage(image) {
    setPreviewImage({
      kind: 'storage',
      previewUrl: image.url,
      storageUrl: image.url,
    });
    setPreviewError('');
    setUploadSuccessMessage('');
    resetResult();
    setIsStorageBrowserOpen(false);
  }

  async function handleDeleteStorageImage(image) {
    try {
      await deleteAiImage({ officeCode, path: image.path });
      setStorageImages((current) => current.filter((entry) => entry.path !== image.path));

      if (previewImage?.storageUrl === image.url) {
        setPreviewImage(null);
        resetResult();
      }
    } catch (error) {
      setStorageListError(
        error instanceof Error ? error.message : '이미지를 삭제하지 못했습니다.',
      );
    }
  }

  return {
    previewImage,
    previewError,
    isGenerating,
    isApplying,
    mode,
    matchedRowIds,
    unmatchedReason,
    applyErrorMessage,
    appliedCount,
    isStorageBrowserOpen,
    storageImages,
    isLoadingStorageImages,
    storageListError,
    isUploadingFile,
    uploadSuccessMessage,
    isSavingImage,
    handleSelectFile,
    handleGenerateImage,
    handleClearPreview,
    handleSaveGeneratedImage,
    handleApplyRequest,
    handleOpenStorageBrowser,
    handleCloseStorageBrowser,
    handleSelectStorageImage,
    handleDeleteStorageImage,
  };
}
