import { useState } from 'react';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiImageApplyPanel.module.css';

function findRowById(rows, rowId) {
  return (
    (Array.isArray(rows) ? rows : []).find((row) => row.row_id === rowId) ??
    null
  );
}

function AiImageStorageBrowser({
  storageImages,
  isLoadingStorageImages,
  storageListError,
  onSelect,
  onDelete,
}) {
  function handleDeleteClick(image) {
    if (
      !window.confirm('이 이미지를 삭제할까요? 저장소에서도 함께 삭제됩니다.')
    ) {
      return;
    }

    onDelete(image);
  }

  return (
    <div className={styles.storageBrowser}>
      {isLoadingStorageImages ? (
        <p className={styles.status}>불러오는 중...</p>
      ) : null}
      {!isLoadingStorageImages && storageListError ? (
        <p className={styles.status}>{storageListError}</p>
      ) : null}
      {!isLoadingStorageImages &&
      !storageListError &&
      storageImages.length === 0 ? (
        <p className={styles.status}>저장된 이미지가 없습니다.</p>
      ) : null}
      {!isLoadingStorageImages && storageImages.length > 0 ? (
        <ul className={styles.storageGrid}>
          {storageImages.map((image) => (
            <li key={image.path} className={styles.storageGridItem}>
              <button
                type="button"
                className={styles.storageImageButton}
                aria-label={`storage-image-${image.path}`}
                onClick={() => onSelect(image)}
              >
                <img
                  className={styles.storageImageThumb}
                  src={image.url}
                  alt=""
                />
              </button>
              <button
                type="button"
                className={styles.storageImageDeleteButton}
                aria-label={`storage-image-delete-${image.path}`}
                onClick={() => handleDeleteClick(image)}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AiImageApplyMatchList({ matchedRowIds, rows }) {
  return (
    <ul className={styles.matchList}>
      {matchedRowIds.map((rowId) => {
        const row = findRowById(rows, rowId);

        return (
          <li key={rowId} className={styles.matchItem}>
            {row?.product_name || rowId}
          </li>
        );
      })}
    </ul>
  );
}

export function AiImageApplyPanel({ imageApply }) {
  const [generatePromptDraft, setGeneratePromptDraft] = useState('');
  const [instructionDraft, setInstructionDraft] = useState('');

  if (!imageApply) {
    return null;
  }

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
  } = imageApply;

  function handleFileInputChange(event) {
    const file = event.target.files?.[0] ?? null;
    handleSelectFile(file);
    event.target.value = '';
  }

  function handleGenerateSubmit() {
    const prompt = generatePromptDraft.trim();

    if (prompt === '' || isGenerating) {
      return;
    }

    handleGenerateImage(prompt);
  }

  function handleApplySubmit() {
    const instruction = instructionDraft.trim();

    if (instruction === '' || isApplying) {
      return;
    }

    handleApplyRequest(instruction);
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
      <p className={styles.desc}>
        이미지를 업로드하거나 AI에게 생성 요청한 뒤, 어느 상품/분류에 적용할지
        말해주세요. 예: 복합비료 분류에 적용해줘
      </p>

      <div className={styles.sourceRow}>
        <label
          className={styles.uploadButton}
          htmlFor="ai-image-apply-file-input"
          aria-disabled={isUploadingFile}
        >
          {isUploadingFile ? '업로드 중...' : '📎 이미지 업로드'}
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
          {isStorageBrowserOpen ? '닫기' : '🗂️ 저장소에서 선택'}
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
          placeholder="예: 복합비료 20kg 포대 스튜디오 컷 이미지 생성해줘"
          rows={1}
        />
        <button
          type="button"
          className={styles.generateButton}
          disabled={generatePromptDraft.trim() === '' || isGenerating}
          onClick={handleGenerateSubmit}
        >
          {isGenerating ? '생성 중...' : 'AI 생성'}
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
            !previewImage?.storageUrl || instructionDraft.trim() === '' || isApplying
          }
          onClick={handleApplySubmit}
        >
          {isApplying ? '적용 중...' : '적용'}
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
