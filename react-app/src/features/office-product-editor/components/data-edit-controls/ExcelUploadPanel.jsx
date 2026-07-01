import { MAX_WARNING_ROW_COUNT } from '../../model/review-table/reviewTableConfigModel';
import formStyles from '../shared/formControls.module.css';
import sharedStyles from '../shared/panel.module.css';
import styles from './ExcelUploadSection.module.css';
import warningStyles from './FileWarningsPanel.module.css';

function FileWarningsPanel({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <section className={`${sharedStyles.panel} ${sharedStyles.compactPanel}`}>
      <div className={sharedStyles.panelHeader}>
        <h2 className={sharedStyles.panelTitle}>파일 경고</h2>
      </div>
      <ul className={warningStyles.warningList}>
        {warnings.map((warning) => (
          <li key={warning} className={warningStyles.warningItem}>
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WarningRowsPanel({ rows }) {
  if (rows.length === 0) {
    return null;
  }

  const visibleRows = rows.slice(0, MAX_WARNING_ROW_COUNT);

  return (
    <section className={`${sharedStyles.panel} ${sharedStyles.compactPanel}`}>
      <div className={sharedStyles.panelHeader}>
        <h2 className={sharedStyles.panelTitle}>행 경고</h2>
        <span className={sharedStyles.panelMeta}>{visibleRows.length}건</span>
      </div>

      <div className={warningStyles.warningRows}>
        {visibleRows.map((row) => (
          <article
            key={`${row.product_code ?? 'missing-code'}-${row.sale_price_type_code ?? 'missing-type'}`}
            className={warningStyles.warningRowCard}
          >
            <div className={warningStyles.warningRowHeader}>
              <strong>
                {row.product_name || row.product_code || '이름 없는 행'}
              </strong>
              <span className={warningStyles.warningRowMeta}>
                {row.product_code || '-'} / {row.sale_price_type_code || '-'}
              </span>
            </div>
            <ul className={warningStyles.warningList}>
              {row.warnings.map((warning) => (
                <li
                  key={`${row.product_code}-${warning}`}
                  className={warningStyles.warningItem}
                >
                  {warning}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ExcelUploadPanel({
  onWorkbookChange,
  isLoading,
  loadingErrorMessage,
  fileWarnings,
  warningRows = [],
}) {
  return (
    <>
      {onWorkbookChange ? (
        <>
          <div className={styles.uploadBlock}>
            <h3 className={styles.sectionTitle}>
              📊 엑셀 업로드 (31-6447에서 엑셀파일을 다운로드한 뒤 선택하세요.)
            </h3>
            <p className={styles.desc}>
              ⚠️ 새 파일 선택 시 현재 저장된 데이터가 삭제되고 새 파일로 완전히
              교체됩니다.
            </p>
            <label className={styles.uploadBtn} htmlFor="excel-workbook-input">
              📂 파일 선택
            </label>
            <input
              id="excel-workbook-input"
              className={formStyles.fileInput}
              type="file"
              accept=".xlsx,.xls"
              onChange={onWorkbookChange}
            />
          </div>

          {isLoading || loadingErrorMessage ? (
            <div className={styles.statusArea}>
              {isLoading ? (
                <div className={sharedStyles.statusMessage}>
                  등록 데이터를 불러오는 중...
                </div>
              ) : null}
              {loadingErrorMessage ? (
                <div className={sharedStyles.errorBox}>
                  {loadingErrorMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          <FileWarningsPanel warnings={fileWarnings} />
          <WarningRowsPanel rows={warningRows} />
        </>
      ) : null}
    </>
  );
}
