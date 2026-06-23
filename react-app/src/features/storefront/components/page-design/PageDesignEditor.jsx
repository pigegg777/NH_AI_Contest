import panelStyles from '../../../office-product-editor/components/shared/panel.module.css';
import {
  getPageAiTargetScopeOption,
  PAGE_AI_TARGET_SCOPE_OPTIONS,
} from '../../model/pageAiDesignModel';
import PageStylePromptField from './PageStylePromptField';
import styles from './PageDesignEditor.module.css';

export default function PageDesignEditor({
  pageAiDesign,
  onChangePrompt,
  onChangeTargetScope,
  onApply,
  isApplying,
  errorMessage,
  representativeCategoryLabel,
}) {
  const selectedScope = getPageAiTargetScopeOption(pageAiDesign.targetScope);

  return (
    <div className={styles.editor} data-testid="page-design-editor">
      <section className={styles.section}>
        <div className={styles.editorLayout}>
          <div
            className={styles.promptPanel}
            data-testid="page-design-prompt-panel"
          >
            <div className={styles.promptPanelHeader}>
              <h4 className={styles.promptPanelTitle}>
                원하는 분위기를 먼저 자세히 적어 주세요
              </h4>
              <p
                id="page-style-prompt-help"
                className={styles.promptPanelDescription}
              >
                오른쪽에서 수정할 영역을 고르면, AI가 그 부분만 바꾸도록
                요청됩니다.
              </p>
            </div>

            <div className={styles.promptColumn}>
              <div className={styles.scopeSelectionBanner}>
                <span className={styles.scopeSelectionLabel}>현재 수정 범위</span>
                <strong className={styles.scopeSelectionValue}>
                  {selectedScope?.label ?? '아직 선택 전'}
                </strong>
                <span className={styles.scopeSelectionHint}>
                  {selectedScope
                    ? `${selectedScope.detail}만 수정하도록 프롬프트에 함께 전달됩니다.`
                    : '오른쪽 목록을 눌러 원하는 영역만 잠글 수 있습니다.'}
                </span>
                {representativeCategoryLabel ? (
                  <span className={styles.scopeSelectionMeta}>
                    기준 카테고리: {representativeCategoryLabel}
                  </span>
                ) : null}
              </div>

              <PageStylePromptField
                value={pageAiDesign.prompt}
                onChange={onChangePrompt}
                className={styles.promptField}
                describedBy="page-style-prompt-help"
              />

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  data-testid="apply-page-ai-design"
                  onClick={onApply}
                  disabled={isApplying}
                >
                  {isApplying ? '적용 중...' : '페이지 스타일 적용'}
                </button>
              </div>

              {errorMessage ? (
                <div className={panelStyles.errorBox}>{errorMessage}</div>
              ) : null}
            </div>
          </div>

          <aside className={styles.scopePanel}>
            <p className={styles.scopeListLabel}>수정 가능 영역</p>
            <ul
              className={styles.scopeList}
              data-testid="page-design-scope-list"
            >
              {PAGE_AI_TARGET_SCOPE_OPTIONS.map((item) => {
                const isSelected = pageAiDesign.targetScope === item.id;

                return (
                  <li key={item.id} className={styles.scopeItem}>
                    <button
                      type="button"
                      className={`${styles.scopeButton} ${isSelected ? styles.scopeButtonActive : ''}`}
                      data-testid={`page-design-scope-${item.id}`}
                      aria-pressed={isSelected}
                      onClick={() => onChangeTargetScope(item.id)}
                    >
                      <span className={styles.scopeButtonText}>
                        <span className={styles.scopeLabel}>{item.label}</span>
                        <span className={styles.scopeDetail}>{item.detail}</span>
                      </span>
                      <span className={styles.scopeState}>
                        {isSelected ? '선택됨' : '범위 지정'}
                      </span>
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
