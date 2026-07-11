import { STOREFRONT_CHAT_MODE_OPTIONS } from "./storefrontChatModes";
import styles from "./ModeChoiceBubble.module.css";

export default function ModeChoiceBubble({ message, onChooseMode }) {
  const isActionable = message.isActionable !== false;

  return (
    <div
      className={styles.modeChoiceBubble}
      data-testid="storefront-mode-choice-bubble"
    >
      <p className={styles.modeChoiceText}>{message.text}</p>

      <div className={styles.modeChoiceGrid}>
        {STOREFRONT_CHAT_MODE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.modeChoiceButton}
            aria-label={option.label}
            disabled={!isActionable}
            aria-disabled={!isActionable}
            onClick={() => {
              if (isActionable) {
                onChooseMode(option.id);
              }
            }}
          >
            <span className={styles.modeChoiceLabel}>{option.label}</span>
            <span
              className={styles.modeChoiceDescription}
              aria-hidden="true"
            >
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
