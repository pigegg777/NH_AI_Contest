import ChatMessageBubble from "./ChatMessageBubble";
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

export default function StorefrontChatThread({
  appliedDesign,
  canUndo,
  intro,
  onUndo,
  session,
}) {
  const visibleMessages = session.messages.filter(
    (message) => message.kind !== "mode-choice" && message.kind !== "mode-transition",
  );

  return (
    <div className={styles.threadFrame}>
      {appliedDesign}
      {intro}
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
