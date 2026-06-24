import panelStyles from '../../../office-product-editor/components/shared/panel.module.css';
import ChatMessageBubble from './ChatMessageBubble';
import ScopeSelectorStrip from './ScopeSelectorStrip';
import styles from './AiChatPanel.module.css';

function resolveScopeLabel(scopeOptions, scopeId) {
  if (!scopeId) {
    return '';
  }

  return (scopeOptions || []).find((option) => option.id === scopeId)?.label ?? '';
}

export default function AiChatPanel({
  messages,
  scopeOptions,
  selectedScope,
  onScopeChange,
  scopeTestIdPrefix,
  scopeListTestId,
  includeNoneScopeOption = false,
  inputField,
  onSend,
  sendLabel,
  sendTestId,
  isSending,
  onUndo,
  undoTestId,
  canUndo = false,
  errorMessage,
  panelTestId,
  emptyStateText,
}) {
  return (
    <div className={styles.panel} data-testid={panelTestId}>
      <ScopeSelectorStrip
        scopeOptions={scopeOptions}
        selectedScope={selectedScope}
        onScopeChange={onScopeChange}
        testIdPrefix={scopeTestIdPrefix}
        listTestId={scopeListTestId}
        includeNoneOption={includeNoneScopeOption}
      />

      <ul className={styles.messageList}>
        {messages.length === 0 ? (
          <li className={styles.emptyState}>{emptyStateText}</li>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              scopeLabel={resolveScopeLabel(scopeOptions, message.scope)}
            />
          ))
        )}
      </ul>

      <div className={styles.inputRow}>
        {inputField}
        <button
          type="button"
          className={styles.sendButton}
          data-testid={sendTestId}
          onClick={onSend}
          disabled={isSending}
        >
          {isSending ? '적용 중...' : sendLabel}
        </button>
        {canUndo ? (
          <button type="button" className={styles.undoButton} data-testid={undoTestId} onClick={onUndo}>
            되돌리기
          </button>
        ) : null}
      </div>

      {errorMessage ? <div className={panelStyles.errorBox}>{errorMessage}</div> : null}
    </div>
  );
}
