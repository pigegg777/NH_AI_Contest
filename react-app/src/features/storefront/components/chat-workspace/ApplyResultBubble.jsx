import styles from './StorefrontChatThread.module.css';

export default function ApplyResultBubble({ canUndo, message, onUndo }) {
  return (
    <li className={styles.threadItem}>
      <div className={styles.applyResultBubble}>
        <p className={styles.applyResultText}>{message.text}</p>

        {canUndo ? (
          <button
            type="button"
            className={styles.returnButton}
            onClick={onUndo}
          >
            되돌리기
          </button>
        ) : null}
      </div>
    </li>
  );
}
