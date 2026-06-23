import panelStyles from '../../../office-product-editor/components/shared/panel.module.css';
import { CARD_AI_TARGET_SCOPE_OPTIONS, getCardAiTargetScopeOption } from '../../model/cardAiDesignModel';
import { CARD_CARDS_PER_ROW_OPTIONS } from '../../model/cardCompositionModel';
import CardStylePromptField from './CardStylePromptField';
import styles from './CardDesignEditor.module.css';

export default function CardDesignEditor({
  cardStyle,
  cardAiDesign,
  onChangePrompt,
  onChangeTargetScope,
  onChangeCardsPerRow,
  onApply,
  onUndo,
  canUndo,
  isApplying,
  errorMessage,
  warningMessage,
}) {
  const selectedScope = getCardAiTargetScopeOption(cardAiDesign.targetScope);

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

      <section className={styles.section}>
        <div className={styles.editorLayout}>
          <div className={styles.promptPanel} data-testid="card-design-prompt-panel">
            <div className={styles.promptPanelHeader}>
              <h4 className={styles.promptPanelTitle}>원하는 카드 변경을 자세히 적어 주세요</h4>
              <p id="card-style-prompt-help" className={styles.promptPanelDescription}>
                오른쪽에서 수정할 영역을 고르면, AI가 그 부분만 바꾸도록 요청됩니다. 고르지 않으면 프롬프트 내용에 맞는 모든 영역이 함께 바뀝니다.
              </p>
            </div>

            <div className={styles.promptColumn}>
              <div className={styles.scopeSelectionBanner}>
                <span className={styles.scopeSelectionLabel}>현재 수정 범위</span>
                <strong className={styles.scopeSelectionValue}>
                  {selectedScope?.label ?? '전체 (선택 안 함)'}
                </strong>
                <span className={styles.scopeSelectionHint}>
                  {selectedScope
                    ? `${selectedScope.detail}만 수정하도록 프롬프트에 함께 전달됩니다.`
                    : '오른쪽 목록에서 영역을 고르면 그 부분만 잠글 수 있습니다.'}
                </span>
              </div>

              <CardStylePromptField
                value={cardAiDesign.prompt}
                onChange={onChangePrompt}
                className={styles.promptField}
                describedBy="card-style-prompt-help"
                testId="card-design-prompt"
              />

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  data-testid="apply-ai-suggestion"
                  onClick={onApply}
                  disabled={isApplying}
                >
                  {isApplying ? '적용 중...' : 'AI로 카드 다듬기'}
                </button>
                {canUndo ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    data-testid="undo-ai-changes"
                    onClick={onUndo}
                  >
                    되돌리기
                  </button>
                ) : null}
              </div>

              {warningMessage ? <div className={styles.warningBox}>{warningMessage}</div> : null}
              {errorMessage ? <div className={panelStyles.errorBox}>{errorMessage}</div> : null}
            </div>
          </div>

          <aside className={styles.scopePanel}>
            <p className={styles.scopeListLabel}>수정 범위 선택</p>
            <ul className={styles.scopeList} data-testid="card-design-scope-list">
              <li className={styles.scopeItem}>
                <button
                  type="button"
                  className={`${styles.scopeButton} ${!cardAiDesign.targetScope ? styles.scopeButtonActive : ''}`}
                  data-testid="card-design-scope-none"
                  aria-pressed={!cardAiDesign.targetScope}
                  onClick={() => onChangeTargetScope('')}
                >
                  <span className={styles.scopeButtonText}>
                    <span className={styles.scopeLabel}>선택 안 함</span>
                    <span className={styles.scopeDetail}>프롬프트에 맞는 모든 영역을 함께 적용</span>
                  </span>
                  <span className={styles.scopeState}>{!cardAiDesign.targetScope ? '선택됨' : '전체 적용'}</span>
                </button>
              </li>
              {CARD_AI_TARGET_SCOPE_OPTIONS.map((item) => {
                const isSelected = cardAiDesign.targetScope === item.id;

                return (
                  <li key={item.id} className={styles.scopeItem}>
                    <button
                      type="button"
                      className={`${styles.scopeButton} ${isSelected ? styles.scopeButtonActive : ''}`}
                      data-testid={`card-design-scope-${item.id}`}
                      aria-pressed={isSelected}
                      onClick={() => onChangeTargetScope(item.id)}
                    >
                      <span className={styles.scopeButtonText}>
                        <span className={styles.scopeLabel}>{item.label}</span>
                        <span className={styles.scopeDetail}>{item.detail}</span>
                      </span>
                      <span className={styles.scopeState}>{isSelected ? '선택됨' : '범위 지정'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>
    </div>
  );
}
