import { useState } from 'react';
import { FileWarningsPanel } from './FileWarningsPanel';
import { PreviousDataCarryOverDialog } from './PreviousDataCarryOverDialog';
import controls from '../shared/controlPrimitives.module.css';
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
  showWarnings = true,
}) {
  if (!onWorkbookChange) {
    return null;
  }

  const uploadContent = (
    <>
        <div className={styles.uploadBlock}>
          <div className={styles.uploadHeader}>
            <div className={styles.uploadHeading}>
              <h3 className={styles.sectionTitle}>📊 엑셀 업로드</h3>
              <span className={styles.sectionHint}>31-6447에서 내려받은 파일</span>
            </div>
            <label
              className={controls.actionButton}
              htmlFor="excel-workbook-input"
            >
              📂 파일 선택
            </label>
            <input
              id="excel-workbook-input"
              className={controls.fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={onWorkbookChange}
            />
          </div>
          <p className={styles.desc}>
            새 파일을 올리면 저장된 데이터가 교체됩니다. 이미 등록된 분류는
            사진·비고를 이어받을 수 있습니다.
          </p>
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
    </>
  );

  if (!showWarnings) {
    return <div className={styles.tabColumnLeft}>{uploadContent}</div>;
  }

  return (
    <div className={styles.tabColumns}>
      <div className={styles.tabColumnLeft}>{uploadContent}</div>
      <div className={styles.tabColumnRight}>
        <FileWarningsPanel fileWarnings={fileWarnings} warningRows={warningRows} />
      </div>
    </div>
  );
}
