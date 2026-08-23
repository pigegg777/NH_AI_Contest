import { STOREFRONT_CHAT_MODE_OPTIONS } from "./storefrontChatModes";
import styles from "./ModeChoiceBubble.module.css";

export default function ModeChoiceBubble({
  message,
  onChooseMode,
  activeModeId,
}) {
  const isActionable = message.isActionable !== false;

  return (
    <div
      className={styles.modeChoiceBubble}
      data-testid="storefront-mode-choice-bubble"
      role="group"
      aria-label={message.text}
    >
      {STOREFRONT_CHAT_MODE_OPTIONS.map((option) => {
        const isActive = option.id === activeModeId;

        return (
          <button
            key={option.id}
            type="button"
            className={
              isActive ? styles.modeChoiceButtonActive : styles.modeChoiceButton
            }
            aria-label={option.label}
            aria-pressed={isActive}
            disabled={!isActionable}
            aria-disabled={!isActionable}
            onClick={() => {
              if (isActionable) {
                onChooseMode(option.id);
              }
            }}
          >
            <span className={styles.modeChoiceLabel}>{option.label}</span>
            <span className={styles.modeChoiceDescription} aria-hidden="true">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
