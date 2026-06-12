import styles from '../../pages/ExcelExtractWorkbookReviewPage.module.css';
import { DEFAULT_CATEGORY_NAMES } from '../../model/catalog/officeProductDataCatalogModel';

export function TableNameCard({
  customTableName,
  inputRef,
  onTableNameChange,
  showsTableNameInput,
  validationError,
  canCreateTable,
  onCreateTable,
}) {
  const isCustomTableNameEmpty = customTableName.trim().length === 0;

  if (!showsTableNameInput) {
    return null;
  }

  function handleTableNameChange(event) {
    if (DEFAULT_CATEGORY_NAMES.includes(event.target.value.trim())) {
      return;
    }

    onTableNameChange(event);
  }

  return (
    <aside className={styles.tableNameCard} aria-label="테이블 이름 설정">
      <div className={styles.tableNameCardHeader}>
        <h3 className={styles.tableNameCardTitle}>새 테이블 이름</h3>
        <span className={styles.tableNameRequiredBadge}>필수</span>
      </div>

      <p className={styles.tableNameCardDescription}>
        추가할 테이블 이름을 입력한 뒤 업로드하세요
      </p>

      <div className={styles.tableNameRow}>
        <label
          className={`${styles.catalogInlineField} ${styles.tableNameRowField}`}
          htmlFor="table-name-input"
        >
          <span className={styles.catalogInlineLabel}>테이블 이름</span>
          <input
            ref={inputRef}
            id="table-name-input"
            className={styles.catalogInlineInput}
            type="text"
            value={customTableName}
            onChange={handleTableNameChange}
            placeholder="예: 자재, 종자, 사료"
          />
        </label>

        <button
          type="button"
          className={styles.createTableButton}
          onClick={onCreateTable}
          disabled={!canCreateTable}
        >
          만들기
        </button>
      </div>

      {isCustomTableNameEmpty ? (
        <p className={styles.catalogInlineHint}>저장 전에 테이블 이름을 입력하세요</p>
      ) : validationError ? (
        <p className={styles.tableNameError}>{validationError}</p>
      ) : null}
    </aside>
  );
}
