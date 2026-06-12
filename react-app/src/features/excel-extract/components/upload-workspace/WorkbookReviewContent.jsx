import styles from '../../pages/ExcelExtractWorkbookReviewPage.module.css';
import { TableNameCard } from './TableNameCard';
import { WorkbookReviewResultSection } from '../result-table/WorkbookReviewResultSection';
import { WorkbookDropzone } from '../result-table/ResultTableSection';
import { FileWarningsPanel, WarningRowsPanel } from '../result-table/WarningPanels';

export function EmptySelectionState() {
  return (
    <div className={styles.emptySelectionState}>
      <p className={styles.emptySelectionTitle}>등록 데이터를 선택하거나 추가하세요</p>
      <p className={styles.emptySelectionHint}>
        왼쪽 목록에서 비료, 농약 또는 등록된 데이터를 선택하면 이곳에 표시됩니다.
      </p>
    </div>
  );
}

export function RegisteredDataReviewSection({
  selectedFileName,
  onWorkbookChange,
  isExtracting,
  errorMessage,
  isRegisteredProductDataLoading,
  registeredProductDataErrorMessage,
  resultSectionProps,
}) {
  return (
    <>
      <div className={styles.viewToolbar}>
        <div className={styles.viewToolbarFile}>
          <label className={styles.uploadButton} htmlFor="excel-workbook-input">
            파일 선택
          </label>
          <input
            id="excel-workbook-input"
            className={styles.fileInput}
            type="file"
            accept=".xlsx,.xls"
            onChange={onWorkbookChange}
          />
          <span className={styles.fileName}>
            {selectedFileName || '선택된 파일이 없습니다'}
          </span>
        </div>
        <p className={styles.viewToolbarHint}>
          새 엑셀 파일을 선택하면 이 데이터를 신규로 등록(덮어쓰기)합니다.
        </p>
      </div>

      {isExtracting ? <div className={styles.statusMessage}>엑셀 추출 중...</div> : null}
      {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
      {isRegisteredProductDataLoading ? (
        <div className={styles.statusMessage}>등록된 데이터를 불러오는 중...</div>
      ) : null}
      {registeredProductDataErrorMessage ? (
        <div className={styles.errorBox}>{registeredProductDataErrorMessage}</div>
      ) : null}

      <WorkbookReviewResultSection {...resultSectionProps} />
    </>
  );
}

export function UploadWorkspaceSection({
  tableNameCardProps,
  result,
  warningRows,
  selectedFileName,
  onWorkbookChange,
  onSave,
  canSave,
  isExtracting,
  isMerging,
  aiIsAnalyzing,
  isSaving,
  isMerged,
  mergeStatusMessage,
  errorMessage,
  mergeError,
  saveErrorMessage,
  saveSuccessMessage,
  canUploadFile,
  onFileSelected,
  resultSectionProps,
}) {
  return (
    <>
      <div className={styles.uploadWorkspace}>
        <TableNameCard {...tableNameCardProps} />

        <div className={styles.uploadMain}>
          {result ? (
            <div className={styles.uploadGroup}>
              <section id="section-upload" className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>업로드 / 작업</h2>
                </div>

                <div className={styles.uploadRow}>
                  <label className={styles.uploadButton} htmlFor="excel-workbook-input">
                    파일 선택
                  </label>
                  <input
                    id="excel-workbook-input"
                    className={styles.fileInput}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={onWorkbookChange}
                  />
                  <span className={styles.fileName}>
                    {selectedFileName || '선택된 파일이 없습니다'}
                  </span>
                </div>

                <div className={styles.mergeActionRow}>
                  <button
                    type="button"
                    className={styles.saveButton}
                    onClick={onSave}
                    disabled={!canSave || isExtracting || isMerging || aiIsAnalyzing || isSaving}
                  >
                    {isSaving ? '저장 중...' : '저장하기'}
                  </button>
                  {isMerged && mergeStatusMessage ? (
                    <span className={styles.mergeMeta}>{mergeStatusMessage}</span>
                  ) : null}
                </div>

                {isExtracting ? <div className={styles.statusMessage}>엑셀 추출 중...</div> : null}
                {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
                {mergeError ? <div className={styles.errorBox}>{mergeError}</div> : null}
                {saveErrorMessage ? <div className={styles.errorBox}>{saveErrorMessage}</div> : null}
                {saveSuccessMessage ? (
                  <div className={styles.successBox}>{saveSuccessMessage}</div>
                ) : null}
              </section>

              <FileWarningsPanel warnings={result.warnings} />
              <WarningRowsPanel rows={warningRows} />
            </div>
          ) : (
            <WorkbookDropzone
              selectedFileName={selectedFileName}
              isExtracting={isExtracting}
              disabled={!canUploadFile}
              disabledHint="테이블 이름을 입력하면 업로드할 수 있습니다."
              onFileSelected={onFileSelected}
            />
          )}
        </div>
      </div>

      {!result && errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}

      {result ? <WorkbookReviewResultSection {...resultSectionProps} /> : null}
    </>
  );
}
