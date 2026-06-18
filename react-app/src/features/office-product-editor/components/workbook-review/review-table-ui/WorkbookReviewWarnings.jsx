import { MAX_WARNING_ROW_COUNT } from '../../../model/table';
import panelStyles from '../../shared/panel.module.css';
import styles from './WorkbookReviewWarnings.module.css';

export function FileWarningsPanel({ warnings }) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  return (
    <section className={`${panelStyles.panel} ${panelStyles.compactPanel}`}>
      <div className={panelStyles.panelHeader}>
        <h2 className={panelStyles.panelTitle}>파일 경고</h2>
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

export function WarningRowsPanel({ rows }) {
  if (rows.length === 0) {
    return null;
  }

  const visibleRows = rows.slice(0, MAX_WARNING_ROW_COUNT);

  return (
    <section className={`${panelStyles.panel} ${panelStyles.compactPanel}`}>
      <div className={panelStyles.panelHeader}>
        <h2 className={panelStyles.panelTitle}>행 경고</h2>
        <span className={panelStyles.panelMeta}>{visibleRows.length}건</span>
      </div>

      <div className={styles.warningRows}>
        {visibleRows.map((row) => (
          <article
            key={`${row.product_code ?? 'missing-code'}-${row.sale_price_type_code ?? 'missing-type'}`}
            className={styles.warningRowCard}
          >
            <div className={styles.warningRowHeader}>
              <strong>{row.product_name || row.product_code || '이름 없는 행'}</strong>
              <span className={styles.warningRowMeta}>
                {row.product_code || '-'} / {row.sale_price_type_code || '-'}
              </span>
            </div>
            <ul className={styles.warningList}>
              {row.warnings.map((warning) => (
                <li key={`${row.product_code}-${warning}`} className={styles.warningItem}>
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
