import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import builderStyles from '../pages/StorefrontBuilderPage.module.css';
import PageStyleMainPromptField from './page-design/PageStyleMainPromptField';
import PageStyleOverrideFields from './page-design/PageStyleOverrideFields';
import styles from './PageDesignEditor.module.css';

export default function PageDesignEditor({
  pageAiDesign,
  onChangeMainPrompt,
  onChangeHeaderOverridePrompt,
  onChangeCategoryChipsOverridePrompt,
  onChangeSearchOverridePrompt,
  onApply,
  isApplying,
  errorMessage,
  representativeCategoryLabel,
}) {
  return (
    <div className={styles.editor} data-testid="page-design-editor">
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>페이지 디자인 설정</p>
            <h3 className={styles.title}>AI로 페이지 분위기 만들기</h3>
          </div>
          <p className={styles.helper}>
            한 문장으로 전체 분위기를 설명하고, 필요하면 영역별로 세부 스타일을 추가로 요청할 수 있습니다.
          </p>
          {representativeCategoryLabel ? (
            <p className={styles.selectionNote}>
              현재 기준 카테고리: <strong>{representativeCategoryLabel}</strong>
            </p>
          ) : null}
        </div>

        <PageStyleMainPromptField value={pageAiDesign.mainPrompt} onChange={onChangeMainPrompt} />

        <PageStyleOverrideFields
          headerOverridePrompt={pageAiDesign.headerOverridePrompt}
          categoryChipsOverridePrompt={pageAiDesign.categoryChipsOverridePrompt}
          searchOverridePrompt={pageAiDesign.searchOverridePrompt}
          onChangeHeaderOverridePrompt={onChangeHeaderOverridePrompt}
          onChangeCategoryChipsOverridePrompt={onChangeCategoryChipsOverridePrompt}
          onChangeSearchOverridePrompt={onChangeSearchOverridePrompt}
        />

        <div className={builderStyles.actions}>
          <button
            type="button"
            className={builderStyles.primaryButton}
            data-testid="apply-page-ai-design"
            onClick={onApply}
            disabled={isApplying}
          >
            {isApplying ? '적용 중...' : '페이지 스타일 적용'}
          </button>
        </div>

        {errorMessage ? <div className={panelStyles.errorBox}>{errorMessage}</div> : null}
      </section>
    </div>
  );
}
