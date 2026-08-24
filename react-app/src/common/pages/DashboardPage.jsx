import PublicStorefrontQrCard from '../components/PublicStorefrontQrCard';
import productDataInputIcon from '../assets/dashboard/product-data-input.png';
import productPageBuilderIcon from '../assets/dashboard/product-page-builder.png';
import styles from './DashboardPage.module.css';

const COPY = {
  dataEditorTitle: '상품 데이터입력',
  dataEditorDescription:
    '업로드된 원본 데이터에서 고객에게 보여줄 상품 정보를 정리하고 저장합니다.',
  storefrontTitle: 'AI로 상품페이지 만들기',
  storefrontDescription:
    '공개 상품 페이지의 카드 구성과 문구를 AI와 함께 빠르게 다듬습니다.',
  greetingPrefix: '안녕하세요, ',
  greetingSuffix: '님.',
  systemTitle: 'AI로 고객용 상품 페이지를 만들고 배포해 보세요',
  featuresTitle: '상품 페이지 만들기',
  featuresDescription: '데이터 입력부터 고객 공유까지 순서대로 진행하세요.',
  stageBadge: '2단계 작업',
  flowUpload: '엑셀 업로드 및 AI 작업',
  flowBuild: 'AI 페이지 제작 및 디자인',
  flowShare: 'QR 및 페이지링크 공유',
  flowTitle: '진행 순서',
};

const FEATURES = [
  {
    key: 'office-product-editor',
    title: COPY.dataEditorTitle,
    description: COPY.dataEditorDescription,
    iconImage: productDataInputIcon,
    stepLabel: 'STEP 01',
    actionLabel: '데이터 정리 시작',
  },
  {
    key: 'storefront-builder',
    title: COPY.storefrontTitle,
    description: COPY.storefrontDescription,
    iconImage: productPageBuilderIcon,
    stepLabel: 'STEP 02',
    actionLabel: '페이지 제작 시작',
  },
];

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3.5L10.5 8 6 12.5" />
    </svg>
  );
}

export default function DashboardPage({ user, onNavigate }) {
  const name = user?.name;
  const officeCode = user?.office_code?.trim();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.welcome}>
          {name ? (
            <p className={styles.greeting}>
              {COPY.greetingPrefix}
              <strong className={styles.userName}>{name}</strong>
              {COPY.greetingSuffix}
            </p>
          ) : null}
          <h1 className={styles.systemTitle}>{COPY.systemTitle}</h1>
        </div>

        <div className={styles.dashboardSections}>
          <section className={styles.featuresSection}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.featuresTitle}>{COPY.featuresTitle}</h2>
                <p className={styles.featuresDescription}>
                  {COPY.featuresDescription}
                </p>
              </div>
              {/* <span className={styles.stageBadge}>{COPY.stageBadge}</span> */}
            </div>

            <div className={styles.grid}>
              {FEATURES.map(
                ({
                  key,
                  title,
                  description,
                  iconImage,
                  stepLabel,
                  actionLabel,
                }) => (
                  <button
                    key={key}
                    type="button"
                    className={styles.card}
                    onClick={() => onNavigate(key)}
                  >
                    <span className={styles.cardTop}>
                      <span className={styles.cardIcon} aria-hidden="true">
                        <img
                          className={styles.cardIconImage}
                          src={iconImage}
                          alt=""
                          width="54"
                          height="54"
                        />
                      </span>
                      <span className={styles.cardTitle}>{title}</span>
                      {/* <span className={styles.stepLabel} aria-hidden="true">
                        {stepLabel}
                      </span> */}
                    </span>

                    <span className={styles.cardContent}>
                      <span className={styles.cardDesc}>{description}</span>
                    </span>

                    <span className={styles.cardAction}>
                      {actionLabel}
                      <span
                        className={styles.cardActionIcon}
                        aria-hidden="true"
                      >
                        <ChevronIcon />
                      </span>
                    </span>
                  </button>
                ),
              )}
            </div>

            <div
              className={styles.workflow}
              aria-labelledby="dashboard-workflow-title"
            >
              <h3
                id="dashboard-workflow-title"
                className={styles.workflowTitle}
              >
                {COPY.flowTitle}
              </h3>
              <div className={styles.workflowSteps}>
                <span>{COPY.flowUpload}</span>
                <span className={styles.workflowLine} aria-hidden="true" />
                <span>{COPY.flowBuild}</span>
                <span className={styles.workflowLine} aria-hidden="true" />
                <span>{COPY.flowShare}</span>
              </div>
            </div>
          </section>

          <aside className={styles.sideSection}>
            <PublicStorefrontQrCard
              officeCode={officeCode}
              officeName={user?.office_name}
              nhName={user?.nh_name}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
