import styles from "./ChatComposerDock.module.css";

/** A labelled row of mutually exclusive toggle buttons, e.g. 카드 수 or 카드 배치. */
export default function CardChoiceRow({
  label,
  labelId,
  testId,
  options,
  value,
  onChange,
}) {
  return (
    <div className={styles.cardsPerRowControl} data-testid={testId}>
      <p className={styles.cardsPerRowLabel} id={labelId}>
        {label}
      </p>

      <div
        className={styles.cardsPerRowChoices}
        role="group"
        aria-labelledby={labelId}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              option.value === value
                ? styles.cardsPerRowButtonActive
                : styles.cardsPerRowButton
            }
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
