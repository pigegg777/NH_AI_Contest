import styles from './ChatMessageBubble.module.css';

export default function ChatMessageBubble({ message }) {
  const isUser = message.role === 'user';
  const hasBadges = Boolean(message.targetLabel || message.scopeLabel);

  return (
    <li className={`${styles.bubbleRow} ${isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant}`}>
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
        {hasBadges ? (
          <span className={styles.badgeRow}>
            {message.targetLabel ? (
              <span
                className={styles.scopeTag}
                data-testid="chat-message-target-badge"
                data-target={message.target}
              >
                {message.targetLabel}
              </span>
            ) : null}
            {message.scopeLabel ? (
              <span className={styles.scopeTagMuted} data-testid="chat-message-scope-badge">
                {message.scopeLabel}
              </span>
            ) : null}
          </span>
        ) : null}
        <p className={styles.bubbleText}>{message.text}</p>
        {!isUser && message.suggestion ? <p className={styles.suggestionText}>{message.suggestion}</p> : null}
        {!isUser && message.warningMessage ? <p className={styles.warningText}>{message.warningMessage}</p> : null}
      </div>
    </li>
  );
}
