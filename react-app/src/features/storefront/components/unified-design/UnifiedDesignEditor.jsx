import ScopeSelectorStrip from '../ai-chat/ScopeSelectorStrip';
import AiChatPanel from '../ai-chat/AiChatPanel';
import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../../model/page-design/pageAiDesignModel';
import { CARD_AI_TARGET_SCOPE_OPTIONS } from '../../model/card-design/cardAiDesignModel';
import { CARD_CARDS_PER_ROW_OPTIONS } from '../../model/card-design/cardCompositionModel';
import UnifiedDesignPromptField from './UnifiedDesignPromptField';
import styles from './UnifiedDesignEditor.module.css';

const TARGET_OPTIONS = [
  { id: 'page', label: '페이지', detail: '페이지 전체 디자인을 수정합니다.' },
  { id: 'card', label: '카드', detail: '상품 카드 디자인을 수정합니다.' },
];

const EMPTY_STATE_BY_TARGET = {
  page:
    '원하는 페이지 분위기를 자세히 적어 주세요. 예: 신뢰감 있는 블루 톤으로 정리하고, 제목은 조금 더 굵게 해줘',
  card:
    '원하는 카드 변경을 자세히 적어 주세요. 예: 이미지 비중을 키우고 가격은 더 눈에 띄게 보여줘',
};

export default function UnifiedDesignEditor({
  selectedTarget,
  onChangeTarget,
  promptDraft,
  onChangePrompt,
  messages,
  pageTargetScope,
  cardTargetScope,
  onChangePageScope,
  onChangeCardScope,
  onApply,
  isApplying,
  errorMessage,
  canUndo,
  onUndo,
  cardStyle,
  onChangeCardsPerRow,
  representativeCategoryLabel,
}) {
  const isCardTarget = selectedTarget === 'card';
  const scopeOptions = isCardTarget
    ? CARD_AI_TARGET_SCOPE_OPTIONS
    : PAGE_AI_TARGET_SCOPE_OPTIONS;
  const selectedScope = isCardTarget ? cardTargetScope : pageTargetScope;
  const onChangeScope = isCardTarget
    ? onChangeCardScope
    : onChangePageScope;

  return (
    <div className={styles.editor} data-testid="unified-design-editor">
      {representativeCategoryLabel ? (
        <p className={styles.metaLine}>기준 카테고리: {representativeCategoryLabel}</p>
      ) : null}

      <div className={styles.targetSection}>
        <span className={styles.targetLabel}>수정 대상</span>
        <ScopeSelectorStrip
          scopeOptions={TARGET_OPTIONS}
          selectedScope={selectedTarget}
          onScopeChange={onChangeTarget}
          testIdPrefix="unified-design-target"
          listTestId="unified-design-target-list"
        />
      </div>

      {isCardTarget ? (
        <div className={styles.densityRow}>
          <span className={styles.densityLabel}>한 줄에 보일 카드 수</span>
          <div
            className={styles.densityOptions}
            data-testid="card-design-cards-per-row"
          >
            {CARD_CARDS_PER_ROW_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`${styles.densityButton} ${cardStyle.cardsPerRow === option ? styles.densityButtonActive : ''}`}
                aria-pressed={cardStyle.cardsPerRow === option}
                onClick={() => onChangeCardsPerRow(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AiChatPanel
        panelTestId="unified-design-prompt-panel"
        messages={messages}
        scopeOptions={scopeOptions}
        selectedScope={selectedScope}
        onScopeChange={onChangeScope}
        scopeTestIdPrefix="unified-design-scope"
        scopeListTestId="unified-design-scope-list"
        includeNoneScopeOption={isCardTarget}
        inputField={
          <UnifiedDesignPromptField
            value={promptDraft}
            onChange={onChangePrompt}
            targetLabel={selectedTarget}
            testId="unified-design-prompt"
          />
        }
        onSend={onApply}
        sendLabel={
          isCardTarget ? '카드 디자인 적용' : '페이지 디자인 적용'
        }
        sendTestId="apply-unified-ai-design"
        isSending={isApplying}
        onUndo={isCardTarget ? onUndo : undefined}
        undoTestId="undo-ai-changes"
        canUndo={isCardTarget && canUndo}
        errorMessage={errorMessage}
        emptyStateText={EMPTY_STATE_BY_TARGET[selectedTarget]}
      />
    </div>
  );
}
