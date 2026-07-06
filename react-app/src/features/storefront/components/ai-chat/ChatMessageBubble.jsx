import styles from './ChatMessageBubble.module.css';

export default function ChatMessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <li className={`${styles.bubbleRow} ${isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant}`}>
      <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
        {message.targetLabel ? (
          <span
            className={styles.scopeTag}
            data-testid="chat-message-target-badge"
            data-target={message.target}
          >
            {message.targetLabel}
          </span>
        ) : null}
        {!isUser && message.scopeLabel ? (
          <span className={styles.scopeTag}>{message.scopeLabel}</span>
        ) : null}
        <p className={styles.bubbleText}>{message.text}</p>
        {!isUser && message.suggestion ? <p className={styles.suggestionText}>{message.suggestion}</p> : null}
        {!isUser && message.warningMessage ? <p className={styles.warningText}>{message.warningMessage}</p> : null}
      </div>
    </li>
  );
}
