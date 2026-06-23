import StepShell from '../../components/step-shell/StepShell';
import styles from './ProductCategoryStep.module.css';

export default function ProductCategoryStep({ step }) {
  return (
    <StepShell
      eyebrow="1단계"
      title="상품 카테고리 선택"
      description="페이지를 추가하거나 수정할 상품 카테고리를 선택해 주세요."
    >
      <div className={styles.categoryGrid}>
        {step.productCategoryOptions.map((option) => {
          const isActive =
            step.selectedProductCategoryName === option.categoryName;

          return (
            <article
              key={option.categoryName}
              data-testid={`product-category-card-${option.categoryName}`}
              className={`${styles.categoryCard} ${isActive ? styles.categoryCardActive : ''}`}
            >
              <div>
                <h4 className={styles.cardTitle}>{option.categoryName}</h4>
                <p className={styles.cardMeta}>
                  {option.rowCount}개 상품 미리보기 가능
                </p>
              </div>
              <button
                type="button"
                data-testid={`select-product-category-${option.categoryName}`}
                className={
                  isActive
                    ? styles.categorySelectedBadge
                    : styles.primaryButton
                }
                onClick={() =>
                  step.selectProductCategory(option.categoryName)
                }
              >
                {isActive
                  ? '✓ 선택됨'
                  : option.hasDraft
                    ? '페이지 수정'
                    : '페이지 추가'}
              </button>
            </article>
          );
        })}
      </div>
    </StepShell>
  );
}
