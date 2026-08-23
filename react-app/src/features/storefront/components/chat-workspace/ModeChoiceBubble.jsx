import { STOREFRONT_CHAT_MODE_OPTIONS } from "./storefrontChatModes";
import styles from "./ModeChoiceBubble.module.css";

export default function ModeChoiceBubble({
  message,
  onChooseMode,
  activeModeId,
}) {
  const isActionable = message.isActionable !== false;
  const activeOption = STOREFRONT_CHAT_MODE_OPTIONS.find(
    (option) => option.id === activeModeId,
  );

  return (
    <div
      className={styles.modeChoiceBubble}
      data-testid="storefront-mode-choice-bubble"
    >
      <div
        className={styles.modeChoiceGroup}
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
                isActive
                  ? styles.modeChoiceButtonActive
                  : styles.modeChoiceButton
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
              {option.label}
            </button>
          );
        })}
      </div>

      <p className={styles.modeChoiceHelper}>
        {activeOption ? activeOption.description : message.text}
      </p>
    </div>
  );
}
