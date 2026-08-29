import { useAiImageApplyInstructionForm } from '../../../../hooks/ai-image-apply/useAiImageApplyInstructionForm';
import { AiImageStorageBrowser } from './AiImageStorageBrowser';
import { AiImageApplyMatchList } from './AiImageApplyMatchList';
import controls from '../../shared/controlPrimitives.module.css';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiImageApplyPanel.module.css';

export function AiImageApplyPanel({ imageApply }) {
  const {
    rows,
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
  } = imageApply ?? {};

  const {
    generatePromptDraft,
    setGeneratePromptDraft,
    instructionDraft,
    setInstructionDraft,
    handleFileInputChange,
    handleGenerateSubmit,
    handleApplySubmit,
  } = useAiImageApplyInstructionForm({
    handleSelectFile,
    handleGenerateImage,
    isGenerating,
    handleApplyRequest,
    isApplying,
  });

  if (!imageApply) {
    return null;
  }

  return (
    <section
      className={`${primitives.panel} ${primitives.compactPanel} ${styles.panelBlock}`}
    >
      <div className={primitives.panelHeader}>
        <h4 id="ai-image-apply-label" className={primitives.panelTitle}>
          🖼️ 이미지 생성/적용
        </h4>
      </div>
      <p className={styles.flowHint}>
        이미지 업로드 또는 AI 생성
        <span className={styles.flowArrow} aria-hidden="true">
          →
        </span>
        저장
        <span className={styles.flowArrow} aria-hidden="true">
          →
        </span>
        저장소에서 이미지 선택
        <span className={styles.flowArrow} aria-hidden="true">
          →
        </span>
        적용할 상품 조건 입력 후 적용
      </p>
      <div className={styles.sourceRow}>
        <label
          className={styles.uploadButton}
          htmlFor="ai-image-apply-file-input"
          aria-disabled={isUploadingFile}
        >
          {isUploadingFile ? '업로드 중...' : '🗂️ 선택 이미지 업로드'}
        </label>
        <input
          id="ai-image-apply-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={styles.fileInput}
          onChange={handleFileInputChange}
          disabled={isUploadingFile}
        />
        <button
          type="button"
          className={styles.uploadButton}
          onClick={
            isStorageBrowserOpen
              ? handleCloseStorageBrowser
              : handleOpenStorageBrowser
          }
        >
          {isStorageBrowserOpen ? '닫기' : '저장소에서 선택'}
        </button>
      </div>

      {uploadSuccessMessage ? (
        <p className={styles.status}>{uploadSuccessMessage}</p>
      ) : null}

      {isStorageBrowserOpen ? (
        <AiImageStorageBrowser
          storageImages={storageImages}
          isLoadingStorageImages={isLoadingStorageImages}
          storageListError={storageListError}
          onSelect={handleSelectStorageImage}
          onDelete={handleDeleteStorageImage}
        />
      ) : null}

      <div className={primitives.promptRow}>
        <textarea
          aria-label="ai-image-generate-prompt"
          className={primitives.promptInput}
          value={generatePromptDraft}
          onChange={(event) => setGeneratePromptDraft(event.target.value)}
          placeholder="예: 가축분퇴비 기본이미지 생성해줘/비료 기본이미지 생성해줘"
          rows={1}
        />
        <button
          type="button"
          className={controls.actionButton}
          disabled={generatePromptDraft.trim() === '' || isGenerating}
          onClick={handleGenerateSubmit}
        >
          {isGenerating ? '이미지생성 중...' : 'AI 이미지생성'}
        </button>
      </div>

      {previewError ? <p className={styles.status}>{previewError}</p> : null}

      {previewImage ? (
        <div className={styles.previewRow}>
          <img
            className={styles.previewImage}
            src={previewImage.previewUrl}
            alt="적용할 이미지 미리보기"
          />
          {!previewImage.storageUrl ? (
            <button
              type="button"
              className={styles.applyButton}
              disabled={isSavingImage}
              onClick={handleSaveGeneratedImage}
            >
              {isSavingImage ? '저장 중...' : '저장하기'}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClearPreview}
          >
            닫기
          </button>
        </div>
      ) : null}

      <div className={primitives.promptRow}>
        <textarea
          id="ai-image-apply-instruction"
          aria-labelledby="ai-image-apply-label"
          className={primitives.promptInput}
          value={instructionDraft}
          onChange={(event) => setInstructionDraft(event.target.value)}
          placeholder="예: 복합비료 분류에 적용해줘"
          rows={1}
          disabled={!previewImage?.storageUrl}
        />
        <button
          type="button"
          className={styles.applyButton}
          disabled={
            !previewImage?.storageUrl ||
            instructionDraft.trim() === '' ||
            isApplying
          }
          onClick={handleApplySubmit}
        >
          {isApplying ? '이미지 적용 중...' : 'AI 이미지적용'}
        </button>
      </div>

      {isApplying ? <p className={styles.status}>적용 중...</p> : null}
      {!isApplying && mode === 'error' ? (
        <p className={styles.status}>
          {applyErrorMessage || '이미지 적용에 실패했습니다.'}
        </p>
      ) : null}
      {!isApplying && mode === 'openai' && matchedRowIds.length === 0 ? (
        <p className={styles.status}>
          {unmatchedReason || '조건에 맞는 상품을 찾지 못했습니다.'}
        </p>
      ) : null}
      {!isApplying && appliedCount > 0 ? (
        <div className={styles.previewBlock}>
          <p className={styles.matchCount}>
            {appliedCount}개 상품에 이미지를 적용했습니다.
          </p>
          <AiImageApplyMatchList matchedRowIds={matchedRowIds} rows={rows} />
        </div>
      ) : null}
    </section>
  );
}
