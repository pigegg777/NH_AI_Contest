import { useState } from 'react';

import PageDesignEditor from './PageDesignEditor';
import StepShell from './StepShell';
import styles from '../pages/StorefrontBuilderPage.module.css';

export default function ProductCategoryStep({ builder }) {
  const [isDesignSettingsOpen, setIsDesignSettingsOpen] = useState(false);

  return (
    <StepShell
      eyebrow="1단계"
      title="페이지 기본 설정"
      description="페이지의 전반적인 디자인 분위기를 먼저 설정해 주세요."
    >
      <section className={styles.controlCard}>
        <div className={styles.controlCardHeader}>
          <div className={styles.sectionStack}>
            <h3 className={styles.sectionTitle}>페이지 디자인 설정</h3>
            <p className={styles.sectionHint}>
              해당 디자인을 바탕으로 페이지의 전반적인 분위기를 생성할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            data-testid="toggle-page-design-settings"
            aria-expanded={isDesignSettingsOpen}
            onClick={() => setIsDesignSettingsOpen((current) => !current)}
          >
            {isDesignSettingsOpen ? '페이지 디자인 설정 닫기' : '페이지 디자인 설정'}
          </button>
        </div>

        {isDesignSettingsOpen ? (
          <PageDesignEditor
            pageAiDesign={builder.pageAiDesign}
            onChangeMainPrompt={builder.setPageMainPrompt}
            onChangeHeaderOverridePrompt={builder.setPageHeaderOverridePrompt}
            onChangeCategoryChipsOverridePrompt={builder.setPageCategoryChipsOverridePrompt}
            onChangeSearchOverridePrompt={builder.setPageSearchOverridePrompt}
            onApply={builder.applyPageAiDesign}
            isApplying={builder.isApplyingPageAiDesign}
            errorMessage={builder.pageAiErrorMessage}
            representativeCategoryLabel={builder.selectedProductCategoryName}
          />
        ) : null}
      </section>

      <section className={styles.categorySection}>
        <div className={styles.sectionStack}>
          <p className={styles.groupEyebrow}>등록된 카테고리</p>
          <h3 className={styles.sectionTitle}>상품 카테고리 선택</h3>
        </div>

        <div className={styles.categoryGrid}>
          {builder.productCategoryOptions.map((option) => {
            const isActive = builder.selectedProductCategoryName === option.categoryName;

            return (
              <article
                key={option.categoryName}
                data-testid={`product-category-card-${option.categoryName}`}
                className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ''}`}
              >
                <div>
                  <h4 className={styles.cardTitle}>{option.categoryName}</h4>
                  <p className={styles.cardMeta}>{option.rowCount}개 상품 미리보기 가능</p>
                </div>
                <button
                  type="button"
                  data-testid={`select-product-category-${option.categoryName}`}
                  className={isActive ? styles.categorySelectedBadge : styles.primaryButton}
                  onClick={() => builder.selectProductCategory(option.categoryName)}
                >
                  {isActive ? '✓ 선택됨' : option.hasDraft ? '페이지 수정' : '페이지 추가'}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </StepShell>
  );
}
