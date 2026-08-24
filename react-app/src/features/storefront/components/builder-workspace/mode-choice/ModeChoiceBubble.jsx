import { STOREFRONT_CHAT_MODE_OPTIONS } from "./storefrontChatModes";
import styles from "./ModeChoiceBubble.module.css";

function ModeChoiceIcon({ optionId }) {
  if (optionId === "data") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path d="M5 7.5h14M5 12h14M5 16.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m16.5 16.3 1.4 1.4 2.6-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 4.5a7.5 7.5 0 1 0 0 15h1.2a1.8 1.8 0 0 0 1.42-2.9 1.8 1.8 0 0 1 1.42-2.9H18a1.5 1.5 0 0 0 1.5-1.5A7.7 7.7 0 0 0 12 4.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8.4" cy="10.2" r=".9" fill="currentColor" />
      <circle cx="11.4" cy="7.8" r=".9" fill="currentColor" />
      <circle cx="15" cy="9" r=".9" fill="currentColor" />
    </svg>
  );
}

export default function ModeChoiceBubble({
  message,
  onChooseMode,
  activeModeId,
  size = "compact",
}) {
  const isActionable = message.isActionable !== false;
  const sizeClass =
    size === "expanded"
      ? styles.modeChoiceBubbleExpanded
      : styles.modeChoiceBubbleCompact;

  return (
    <div
      className={`${styles.modeChoiceBubble} ${sizeClass}`}
      data-testid="storefront-mode-choice-bubble"
      data-placement={size === "expanded" ? "thread" : "header"}
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
            {size === "expanded" ? (
              <span className={styles.modeChoiceIcon} aria-hidden="true">
                <ModeChoiceIcon optionId={option.id} />
              </span>
            ) : null}
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
