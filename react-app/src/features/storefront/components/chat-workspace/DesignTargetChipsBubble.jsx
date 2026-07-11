import styles from "./ChatComposerDock.module.css";

export default function DesignTargetChipsBubble({
  label,
  options,
  selectedTargetId,
  onSelectTarget,
}) {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  return (
    <div
      className={styles.targetBubble}
      data-testid="storefront-design-target-chips"
    >
      <p className={styles.targetBubbleLabel}>{label}</p>

      <div className={styles.targetChipList} role="list">
        <button
          type="button"
          className={
            selectedTargetId
              ? styles.targetChipButton
              : styles.targetChipButtonActive
          }
          onClick={() => onSelectTarget("")}
        >
          전체
        </button>

        {options.map((option) => {
          const isSelected = option.id === selectedTargetId;

          return (
            <button
              key={option.id}
              type="button"
              className={
                isSelected
                  ? styles.targetChipButtonActive
                  : styles.targetChipButton
              }
              onClick={() => onSelectTarget(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
