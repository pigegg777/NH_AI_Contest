import styles from './FileWarningsPanel.module.css';

const MAX_WARNING_ROW_COUNT = 30;

function FileLevelWarnings({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <section className={`${styles.panel} ${styles.compactPanel}`}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>파일 경고</h2>
      </div>
      <ul className={styles.warningList}>
        {warnings.map((warning) => (
          <li key={warning} className={styles.warningItem}>
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

function WarningRows({ rows }) {
  if (rows.length === 0) {
    return null;
  }
  const visibleRows = rows.slice(0, MAX_WARNING_ROW_COUNT);

  return (
    <section className={`${styles.panel} ${styles.compactPanel}`}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>행 경고</h2>
        <span className={styles.panelMeta}>{visibleRows.length}건</span>
      </div>

      <div className={styles.warningRows}>
        {visibleRows.map((row) => (
          <article
            key={`${row.product_code ?? 'missing-code'}-${row.sale_price_type_code ?? 'missing-type'}`}
            className={styles.warningRowCard}
          >
            <div className={styles.warningRowHeader}>
              <strong>
                {row.product_name || row.product_code || '이름 없는 행'}
              </strong>
              <span className={styles.warningRowMeta}>
                {row.product_code || '-'} / {row.sale_price_type_code || '-'}
              </span>
            </div>
            <ul className={styles.warningList}>
              {row.warnings.map((warning) => (
                <li
                  key={`${row.product_code}-${warning}`}
                  className={styles.warningItem}
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

function EmptyWarningsState() {
  return <p className={styles.emptyState}>표시할 경고가 없습니다</p>;
}

export function FileWarningsPanel({ fileWarnings, warningRows = [] }) {
  const hasNoWarnings =
    (!fileWarnings || fileWarnings.length === 0) && warningRows.length === 0;

  if (hasNoWarnings) {
    return <EmptyWarningsState />;
  }

  return (
    <>
      <FileLevelWarnings warnings={fileWarnings} />
      <WarningRows rows={warningRows} />
    </>
  );
}
