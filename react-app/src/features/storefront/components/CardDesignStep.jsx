import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import StepShell from './StepShell';
import styles from '../pages/StorefrontBuilderPage.module.css';

export default function CardDesignStep({ builder }) {
  return (
    <StepShell
      eyebrow="3단계"
      title="카드 디자인"
      description="확정된 데이터를 바탕으로 카드 디자인을 다듬어보세요."
    >
      <label className={styles.inputLabel}>
        <span>AI로 다듬기</span>
        <textarea
          className={styles.textarea}
          value={builder.aiPrompt}
          onChange={(event) => builder.setAiPrompt(event.target.value)}
          placeholder="예시: 고객이 가격을 빠르게 비교할 수 있게 비료 상품을 강조하고, 모바일에서 읽기 쉬운 안내 페이지로 정리해줘."
        />
      </label>

      {builder.aiSummary ? <p className={styles.summary}>{builder.aiSummary}</p> : null}

      {builder.aiChangeSummary.length > 0 ? (
        <section className={styles.controlCard} data-testid="ai-change-summary-panel">
          <div className={styles.controlCardHeader}>
            <div className={styles.sectionStack}>
              <h3 className={styles.sectionTitle}>AI 변경 요약</h3>
              <p className={styles.sectionHint}>AI가 반영한 변경 내용을 바로 확인할 수 있습니다.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="undo-ai-changes"
              onClick={builder.undoAiChanges}
            >
              AI 되돌리기
            </button>
          </div>

          <ul className={styles.summaryList} data-testid="ai-change-summary">
            {builder.aiChangeSummary.map((item) => (
              <li key={item} className={styles.summaryItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="apply-ai-suggestion"
          onClick={builder.applyAiSuggestion}
          disabled={builder.isAiApplying}
        >
          {builder.isAiApplying ? '적용 중...' : 'AI 초안 적용'}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="save-storefront-draft"
          onClick={builder.saveDraft}
          disabled={builder.status === 'saving'}
        >
          {builder.status === 'saving' ? '저장 중...' : '초안 저장'}
        </button>
      </div>

      {builder.aiErrorMessage ? <div className={panelStyles.errorBox}>{builder.aiErrorMessage}</div> : null}
    </StepShell>
  );
}
