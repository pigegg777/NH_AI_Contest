import { CARD_AI_TARGET_SCOPE_OPTIONS } from '../../model/cardAiDesignModel';
import { CARD_CARDS_PER_ROW_OPTIONS } from '../../model/cardCompositionModel';
import AiChatPanel from '../ai-chat/AiChatPanel';
import CardStylePromptField from './CardStylePromptField';
import styles from './CardDesignEditor.module.css';

export default function CardDesignEditor({
  cardStyle,
  cardAiDesign,
  cardAiMessages,
  onChangePrompt,
  onChangeTargetScope,
  onChangeCardsPerRow,
  onApply,
  onUndo,
  canUndo,
  isApplying,
  errorMessage,
}) {
  return (
    <div className={styles.editor} data-testid="card-design-editor">
      <div className={styles.densityRow}>
        <span className={styles.densityLabel}>한 줄에 보일 카드 수</span>
        <div className={styles.densityOptions} data-testid="card-design-cards-per-row">
          {CARD_CARDS_PER_ROW_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`${styles.densityButton} ${cardStyle.cardsPerRow === option ? styles.densityButtonActive : ''}`}
              aria-pressed={cardStyle.cardsPerRow === option}
              onClick={() => onChangeCardsPerRow(option)}
            >
              {option}개
            </button>
          ))}
        </div>
      </div>

      <AiChatPanel
        panelTestId="card-design-prompt-panel"
        messages={cardAiMessages}
        scopeOptions={CARD_AI_TARGET_SCOPE_OPTIONS}
        selectedScope={cardAiDesign.targetScope}
        onScopeChange={onChangeTargetScope}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        includeNoneScopeOption
        inputField={
          <CardStylePromptField
            value={cardAiDesign.prompt}
            onChange={onChangePrompt}
            describedBy="card-style-prompt-help"
            testId="card-design-prompt"
          />
        }
        onSend={onApply}
        sendLabel="AI로 카드 다듬기"
        sendTestId="apply-ai-suggestion"
        isSending={isApplying}
        onUndo={onUndo}
        undoTestId="undo-ai-changes"
        canUndo={canUndo}
        errorMessage={errorMessage}
        emptyStateText="원하는 카드 변경을 자세히 적어 주세요. 예: 비료 상품을 신뢰감 있게 보여주고, 제목은 조금 더 굵게 해줘"
      />
    </div>
  );
}
