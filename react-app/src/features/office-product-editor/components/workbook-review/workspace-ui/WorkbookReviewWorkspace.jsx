import panelStyles from '../../shared/panel.module.css';
import formStyles from '../../shared/formControls.module.css';
import { WorkbookReviewTableSection } from '../WorkbookReviewTableSection';
import {
  FileWarningsPanel,
  WarningRowsPanel,
} from '../review-table-ui/WorkbookReviewWarnings';
import { WorkbookReviewDropzone } from './WorkbookReviewDropzone';
import { WorkbookReviewTableNameCard } from './WorkbookReviewTableNameCard';
import styles from './WorkbookReviewWorkspace.module.css';

function EmptySelectionState() {
  return (
    <div className={styles.emptySelectionState}>
      <p className={styles.emptySelectionTitle}>왼쪽에서 데이터를 선택하세요</p>
      <p className={styles.emptySelectionHint}>
        등록 데이터를 선택하거나 추가하세요
      </p>
    </div>
  );
}

function RegisteredDataReviewWorkspace({
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
          <label
            className={formStyles.uploadButton}
            htmlFor="excel-workbook-input"
          >
            파일 선택
          </label>
          <input
            id="excel-workbook-input"
            className={formStyles.fileInput}
            type="file"
            accept=".xlsx,.xls"
            onChange={onWorkbookChange}
          />
          <p className={styles.viewToolbarHint}>
            31-6447에서 엑셀파일을 다운로드하세요!
          </p>
          <p className={styles.viewToolbarHint}>
            새 엑셀 파일을 선택하면 이 데이터를 신규로 등록(덮어쓰기)합니다.
          </p>
        </div>
      </div>

      {isExtracting ? (
        <div className={panelStyles.statusMessage}>엑셀 추출 중...</div>
      ) : null}
      {errorMessage ? (
        <div className={panelStyles.errorBox}>{errorMessage}</div>
      ) : null}
      {isRegisteredProductDataLoading ? (
        <div className={panelStyles.statusMessage}>
          등록 데이터를 불러오는 중...
        </div>
      ) : null}
      {registeredProductDataErrorMessage ? (
        <div className={panelStyles.errorBox}>
          {registeredProductDataErrorMessage}
        </div>
      ) : null}

      <WorkbookReviewTableSection {...resultSectionProps} />
    </>
  );
}

function UploadWorkspaceArea({
  tableNameCardProps,
  result,
  warningRows,
  selectedFileName,
  onWorkbookChange,
  isExtracting,
  isMerged,
  mergeStatusMessage,
  errorMessage,
  mergeError,
  canUploadFile,
  onFileSelected,
  resultSectionProps,
}) {
  return (
    <>
      <div className={styles.uploadWorkspace}>
        <WorkbookReviewTableNameCard {...tableNameCardProps} />

        <div className={styles.uploadMain}>
          {result ? (
            <div className={panelStyles.uploadGroup}>
              <section id="section-upload" className={panelStyles.panel}>
                <div className={panelStyles.panelHeader}>
                  <h2 className={panelStyles.panelTitle}>업로드 / 작업</h2>
                </div>

                <div className={styles.uploadRow}>
                  <label
                    className={formStyles.uploadButton}
                    htmlFor="excel-workbook-input"
                  >
                    파일 선택
                  </label>
                  <input
                    id="excel-workbook-input"
                    className={formStyles.fileInput}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={onWorkbookChange}
                  />
                  <span className={styles.fileName}>
                    {selectedFileName || '선택한 파일이 없습니다'}
                  </span>
                </div>

                {isMerged && mergeStatusMessage ? (
                  <div className={styles.mergeActionRow}>
                    <span className={styles.mergeMeta}>
                      {mergeStatusMessage}
                    </span>
                  </div>
                ) : null}

                {isExtracting ? (
                  <div className={panelStyles.statusMessage}>
                    엑셀 추출 중...
                  </div>
                ) : null}
                {errorMessage ? (
                  <div className={panelStyles.errorBox}>{errorMessage}</div>
                ) : null}
                {mergeError ? (
                  <div className={panelStyles.errorBox}>{mergeError}</div>
                ) : null}
              </section>

              <FileWarningsPanel warnings={result.warnings} />
              <WarningRowsPanel rows={warningRows} />
            </div>
          ) : (
            <WorkbookReviewDropzone
              selectedFileName={selectedFileName}
              isExtracting={isExtracting}
              disabled={!canUploadFile}
              disabledHint="테이블을 만든 뒤 사이드바에서 선택하면 업로드할 수 있습니다."
              onFileSelected={onFileSelected}
            />
          )}
        </div>
      </div>

      {!result && errorMessage ? (
        <div className={panelStyles.errorBox}>{errorMessage}</div>
      ) : null}

      {result ? <WorkbookReviewTableSection {...resultSectionProps} /> : null}
    </>
  );
}

export function WorkbookReviewWorkspace({
  tableNameMode,
  isViewingRegisteredData,
  tableNameCardProps,
  result,
  warningRows,
  selectedFileName,
  onWorkbookChange,
  isExtracting,
  isMerged,
  mergeStatusMessage,
  errorMessage,
  mergeError,
  canUploadFile,
  onFileSelected,
  isRegisteredProductDataLoading,
  registeredProductDataErrorMessage,
  resultSectionProps,
}) {
  if (tableNameMode === '') {
    return <EmptySelectionState />;
  }

  if (isViewingRegisteredData) {
    return (
      <RegisteredDataReviewWorkspace
        onWorkbookChange={onWorkbookChange}
        isExtracting={isExtracting}
        errorMessage={errorMessage}
        isRegisteredProductDataLoading={isRegisteredProductDataLoading}
        registeredProductDataErrorMessage={registeredProductDataErrorMessage}
        resultSectionProps={resultSectionProps}
      />
    );
  }

  return (
    <UploadWorkspaceArea
      tableNameCardProps={tableNameCardProps}
      result={result}
      warningRows={warningRows}
      selectedFileName={selectedFileName}
      onWorkbookChange={onWorkbookChange}
      isExtracting={isExtracting}
      isMerged={isMerged}
      mergeStatusMessage={mergeStatusMessage}
      errorMessage={errorMessage}
      mergeError={mergeError}
      canUploadFile={canUploadFile}
      onFileSelected={onFileSelected}
      resultSectionProps={resultSectionProps}
    />
  );
}
