import { useState } from 'react';

import formStyles from '../../shared/formControls.module.css';
import styles from './WorkbookReviewDropzone.module.css';

export function WorkbookReviewDropzone({
  inputId = 'excel-workbook-input',
  selectedFileName,
  isExtracting,
  disabled = false,
  disabledHint,
  onFileSelected,
}) {
  const [isDragActive, setIsDragActive] = useState(false);

  function handleDragOver(event) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setIsDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);

    if (disabled) {
      return;
    }

    const [file] = event.dataTransfer?.files ?? [];

    if (file) {
      onFileSelected(file);
    }
  }

  function handleInputChange(event) {
    const [file] = event.target.files ?? [];

    if (file) {
      onFileSelected(file);
    }

    event.target.value = '';
  }

  return (
    <div
      className={[
        styles.dropzone,
        isDragActive ? styles.dropzoneActive : '',
        disabled ? styles.dropzoneDisabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <p className={styles.dropzoneIcon} aria-hidden="true">
        📄
      </p>
      <p className={styles.dropzoneTitle}>
        생산경제시스템 31-6447 엑셀을 끌어다 놓거나 선택하세요
      </p>
      <p className={styles.dropzoneHint}>.xlsx, .xls 파일을 지원합니다</p>

      <label
        className={[
          formStyles.uploadButton,
          styles.dropzoneActionButton,
          disabled ? formStyles.uploadButtonDisabled : '',
        ]
          .filter(Boolean)
          .join(' ')}
        htmlFor={inputId}
      >
        파일 선택
      </label>
      <input
        id={inputId}
        className={formStyles.fileInput}
        type="file"
        accept=".xlsx,.xls"
        disabled={disabled}
        onChange={handleInputChange}
      />

      {selectedFileName ? (
        <p className={styles.dropzoneFileName}>
          선택한 파일: {selectedFileName}
        </p>
      ) : null}

      {isExtracting ? (
        <p className={styles.dropzoneStatus}>엑셀 추출 중...</p>
      ) : null}

      {disabled && disabledHint ? (
        <p className={styles.dropzoneDisabledHint}>{disabledHint}</p>
      ) : null}
    </div>
  );
}
