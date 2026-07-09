import styles from "./SelectionSummaryCard.module.css";

export default function SelectionSummaryCard({
  title,
  description,
  meta = [],
  actionLabel,
  actionTestId,
  onAction,
  testId,
}) {
  return (
    <section className={styles.card} data-testid={testId}>
      <div className={styles.header}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{title}</p>
          <p className={styles.description}>{description}</p>
        </div>

        {actionLabel ? (
          <button
            type="button"
            className={styles.actionButton}
            data-testid={actionTestId}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <ul className={styles.metaList}>
          {meta.map((item) => (
            <li key={item} className={styles.metaItem}>
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
