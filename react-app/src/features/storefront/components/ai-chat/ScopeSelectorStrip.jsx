import styles from './ScopeSelectorStrip.module.css';

export default function ScopeSelectorStrip({
  scopeOptions,
  selectedScope,
  onScopeChange,
  testIdPrefix,
  listTestId,
  includeNoneOption = false,
  noneOptionLabel = '선택 안 함',
}) {
  return (
    <ul className={styles.scopeList} data-testid={listTestId}>
      {includeNoneOption ? (
        <li className={styles.scopeItem}>
          <button
            type="button"
            className={`${styles.scopeChip} ${!selectedScope ? styles.scopeChipActive : ''}`}
            data-testid={`${testIdPrefix}-none`}
            aria-pressed={!selectedScope}
            onClick={() => onScopeChange('')}
          >
            {noneOptionLabel}
          </button>
        </li>
      ) : null}
      {scopeOptions.map((option) => {
        const isSelected = selectedScope === option.id;

        return (
          <li key={option.id} className={styles.scopeItem}>
            <button
              type="button"
              className={`${styles.scopeChip} ${isSelected ? styles.scopeChipActive : ''}`}
              data-testid={`${testIdPrefix}-${option.id}`}
              aria-pressed={isSelected}
              title={option.detail}
              onClick={() => onScopeChange(option.id)}
            >
              {option.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
