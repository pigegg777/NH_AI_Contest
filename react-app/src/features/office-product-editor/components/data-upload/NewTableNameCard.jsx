import styles from './NewTableNameCard.module.css';

export function NewTableNameCard({
  customTableName,
  onTableNameChange,
  showsTableNameInput,
  validationError,
  onCreateTable,
}) {
  const isCustomTableNameEmpty = customTableName.trim().length === 0;

  if (!showsTableNameInput) {
    return null;
  }

  return (
    <aside className={styles.tableNameCard} aria-label="테이블 이름 설정">
      <div className={styles.tableNameCardHeader}>
        <h3 className={styles.tableNameCardTitle}>새 테이블 이름</h3>
        {/* <span className={styles.tableNameRequiredBadge}>필수</span> */}
      </div>

      <p className={styles.tableNameCardDescription}>
        새 카테고리 이름을 만든 뒤 사이드바에서 선택해 업로드하세요
      </p>

      <div className={styles.tableNameRow}>
        <label
          className={`${styles.catalogInlineField} ${styles.tableNameRowField}`}
          htmlFor="table-name-input"
        >
          <span className={styles.catalogInlineLabel}>테이블 이름설정</span>
          <input
            id="table-name-input"
            className={styles.catalogInlineInput}
            type="text"
            value={customTableName}
            onChange={onTableNameChange}
            placeholder="예: 자재, 종자, 원예"
          />
        </label>

        <button
          type="button"
          className={styles.createTableButton}
          onClick={onCreateTable}
        >
          만들기
        </button>
      </div>

      {isCustomTableNameEmpty ? (
        <p className={styles.catalogInlineHint}>
          업로드에 사용할 테이블 이름을 입력하세요.
        </p>
      ) : validationError ? (
        <p className={styles.tableNameError}>{validationError}</p>
      ) : null}
    </aside>
  );
}
