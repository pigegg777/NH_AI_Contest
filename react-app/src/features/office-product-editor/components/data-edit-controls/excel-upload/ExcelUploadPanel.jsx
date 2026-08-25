import { useState } from 'react';
import { FileWarningsPanel } from './FileWarningsPanel';
import { PreviousDataCarryOverDialog } from './PreviousDataCarryOverDialog';
import styles from './ExcelUploadSection.module.css';

function DropzoneArea({ onWorkbookChange }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      onWorkbookChange({ target: { files } });
    }
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`.trim()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="excel-upload-dropzone"
    >
      여기로 .xlsx / .xls 파일을 끌어다 놓으세요
    </div>
  );
}

export function ExcelUploadPanel({
  onWorkbookChange,
  isLoading,
  loadingErrorMessage,
  fileWarnings,
  warningRows = [],
  carryOver = null,
}) {
  return onWorkbookChange ? (
    <div className={styles.tabColumns}>
      <div className={styles.tabColumnLeft}>
        <div className={styles.uploadBlock}>
          <h3 className={styles.sectionTitle}>
            📊 엑셀 업로드 (31-6447에서 엑셀파일을 다운로드한 뒤 선택하세요.)
          </h3>
          <p className={styles.desc}>
            새 파일을 선택하면 현재 저장된 데이터가 새 파일로 교체됩니다. 이미
            등록된 분류라면 사진과 비고를 이어받을지 아래에서 고를 수 있습니다.
          </p>
          <label className={styles.uploadBtn} htmlFor="excel-workbook-input">
            📂 파일 선택
          </label>
          <input
            id="excel-workbook-input"
            className={styles.fileInput}
            type="file"
            accept=".xlsx,.xls"
            onChange={onWorkbookChange}
          />
          <DropzoneArea onWorkbookChange={onWorkbookChange} />
        </div>

        {carryOver ? <PreviousDataCarryOverDialog {...carryOver} /> : null}

        {isLoading || loadingErrorMessage ? (
          <div className={styles.statusArea}>
            {isLoading ? (
              <div className={styles.statusMessage}>
                등록 데이터를 불러오는 중...
              </div>
            ) : null}
            {loadingErrorMessage ? (
              <div className={styles.errorBox}>{loadingErrorMessage}</div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.tabColumnRight}>
        <FileWarningsPanel fileWarnings={fileWarnings} warningRows={warningRows} />
      </div>
    </div>
  ) : null;
}
