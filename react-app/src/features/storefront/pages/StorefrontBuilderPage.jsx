import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import StorefrontView from '../components/StorefrontView';
import CardDesignStep from './storefront-builder/CardDesignStep';
import DataSelectionStep from './storefront-builder/DataSelectionStep';
import PageDesignStep from './storefront-builder/PageDesignStep';
import ProductCategoryStep from './storefront-builder/ProductCategoryStep';
import { useStorefrontBuilder } from '../hooks/useStorefrontBuilder';
import styles from './StorefrontBuilderPage.module.css';

const STEP_COMPONENTS = [
  {
    Component: ProductCategoryStep,
    selectStepProps: (builder) => builder.productCategoryStep,
  },
  {
    Component: PageDesignStep,
    selectStepProps: (builder) => builder.pageDesignStep,
  },
  {
    Component: DataSelectionStep,
    selectStepProps: (builder) => builder.dataSelectionStep,
  },
  {
    Component: CardDesignStep,
    selectStepProps: (builder) => builder.cardDesignStep,
  },
];

export default function StorefrontBuilderPage({ officeCode, nhName, onGoHome }) {
  const builder = useStorefrontBuilder({ officeCode, nhName });

  if (builder.status === 'loading') {
    return (
      <div className={styles.page}>
        <div className={panelStyles.statusMessage}>
          스토어프론트 빌더를 불러오는 중...
        </div>
      </div>
    );
  }

  if (builder.status === 'error') {
    return (
      <div className={styles.page}>
        <div className={panelStyles.errorBox}>
          스토어프론트 빌더를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.workspace}>
        <div className={styles.leftColumn}>
          {!builder.hasStarted ? (
            <section className={styles.heroPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>AI 스토어프론트 도우미</p>
                  <h1 className={styles.heroTitle}>AI로 스토어프론트 만들기</h1>
                </div>
              </div>

              <p className={styles.description}>
                먼저 페이지 분위기를 정하고, 생성할 상품 카테고리를 선택한 뒤,
                AI에게 원하는 방향을 입력해 스토어프론트 초안을 만들어보세요.
              </p>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  data-testid="start-storefront-builder"
                  onClick={builder.startSession}
                >
                  시작하기
                </button>
              </div>
            </section>
          ) : (
            <>
              {(() => {
                const activeStep = STEP_COMPONENTS[builder.currentStep];
                const StepComponent = activeStep.Component;
                return (
                  <StepComponent step={activeStep.selectStepProps(builder)} />
                );
              })()}

              <div className={styles.stepNavActions}>
                {builder.currentStep > 0 ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    data-testid="builder-go-previous"
                    onClick={builder.goPrevious}
                  >
                    이전
                  </button>
                ) : null}
                {builder.currentStep === 0 || builder.currentStep === 1 ? (
                  <button
                    type="button"
                    className={styles.primaryButton}
                    data-testid="builder-go-next"
                    onClick={builder.goNext}
                    disabled={
                      builder.currentStep === 0 &&
                      !builder.selectedProductCategoryName
                    }
                  >
                    다음
                  </button>
                ) : null}
                {typeof onGoHome === 'function' ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={onGoHome}
                  >
                    대시보드로 돌아가기
                  </button>
                ) : null}
              </div>

              {builder.status === 'save-error' ? (
                <div className={panelStyles.errorBox}>
                  {builder.errorMessage ||
                    '스토어프론트 초안을 저장하지 못했습니다.'}
                </div>
              ) : null}
            </>
          )}
        </div>

        <section className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <div>
              <p className={styles.eyebrow}>실시간 미리보기</p>
              <h3 className={styles.previewTitle}>
                모바일 스토어프론트 미리보기
              </h3>
            </div>
          </div>

          <div className={styles.previewStage}>
            <div
              className={styles.previewDevice}
              data-testid="mobile-preview-device"
            >
              <div className={styles.previewDeviceSpeaker} />
              <div className={styles.previewDeviceScreen}>
                <StorefrontView
                  config={builder.previewConfig}
                  productRows={builder.previewProductRows}
                  officeName={builder.officeName}
                  nhName={builder.nh_name}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
