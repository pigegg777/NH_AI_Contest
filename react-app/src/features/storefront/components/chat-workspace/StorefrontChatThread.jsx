import ChatMessageBubble from "../ai-chat/ChatMessageBubble";
import ApplyResultBubble from "./ApplyResultBubble";
import styles from "./StorefrontChatThread.module.css";

const PLAIN_CHAT_MESSAGE_KINDS = new Set(["chat-message"]);

function renderMessage(message, options) {
  switch (message.kind) {
    case "apply-result":
      return (
        <ApplyResultBubble
          key={message.id}
          canUndo={Boolean(options?.canUndo)}
          message={message}
          onUndo={options?.onUndo}
        />
      );
    default:
      if (PLAIN_CHAT_MESSAGE_KINDS.has(message.kind)) {
        return <ChatMessageBubble key={message.id} message={message} />;
      }

      throw new Error(
        `Unsupported storefront chat message kind: ${String(message.kind)}`,
      );
  }
}

export default function StorefrontChatThread({ canUndo, onUndo, session }) {
  const visibleMessages = session.messages.filter(
    (message) => message.kind !== "mode-choice" && message.kind !== "mode-transition",
  );

  if (visibleMessages.length === 0) {
    return (
      <div className={`${styles.threadFrame} ${styles.threadFrameEmpty}`}>
        <div
          className={styles.threadEmpty}
          data-testid="storefront-chat-thread-empty"
        >
          <p className={styles.threadEmptyTitle}>
            아직 주고받은 대화가 없습니다
          </p>
          <p className={styles.threadEmptyText}>
            아래에서 바꾸고 싶은 곳을 고르고 원하는 내용을 적어주세요.
            반영한 결과는 여기에 차례로 쌓입니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.threadFrame}>
      <ol className={styles.threadList} data-testid="storefront-chat-thread">
        {visibleMessages.map((message) =>
          renderMessage(message, {
            canUndo,
            onUndo,
          }),
        )}
      </ol>
    </div>
  );
}
