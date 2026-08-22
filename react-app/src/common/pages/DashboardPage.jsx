import PublicStorefrontQrCard from '../components/PublicStorefrontQrCard';
import styles from './DashboardPage.module.css';

const COPY = {
  dataEditorTitle: '상품 데이터입력',
  dataEditorDescription:
    '업로드된 원본 데이터에서 고객에게 보여줄 상품 정보를 정리하고 저장합니다.',
  storefrontTitle: 'AI로 상품페이지 만들기',
  storefrontDescription:
    '공개 상품 페이지의 카드 구성과 문구를 AI와 함께 빠르게 다듬습니다.',
  dashboard: 'NH AI Agent',
  logout: '로그아웃',
  greetingPrefix: '안녕하세요, ',
  greetingSuffix: '님.',
  systemTitle: 'AI로 고객용 상품 페이지를 만들고 배포해 보세요',
  featuresSectionLabel: '주요 기능',
  goTo: '바로가기',
  orgSeparator: ' · ',
};

const FEATURES = [
  {
    key: 'office-product-editor',
    title: COPY.dataEditorTitle,
    description: COPY.dataEditorDescription,
  },
  {
    key: 'storefront-builder',
    title: COPY.storefrontTitle,
    description: COPY.storefrontDescription,
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

function formatStepIndex(index) {
  return String(index + 1).padStart(2, '0');
}

export default function DashboardPage({ user, onNavigate, onLogout }) {
  const name = user?.name;
  const officeCode = user?.office_code?.trim();
  const officeLabel = [user?.nh_name, user?.office_name]
    .filter(Boolean)
    .join(COPY.orgSeparator);
  const initial = name?.trim().charAt(0) ?? '';

  return (
    <div className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navbarInner}>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              NH
            </span>
            <h1 className={styles.navbarTitle}>{COPY.dashboard}</h1>
          </div>

          <div className={styles.navbarActions}>
            {officeLabel ? (
              <span className={styles.officeName}>{officeLabel}</span>
            ) : null}

            {name ? (
              <span className={styles.account}>
                <span className={styles.avatar} aria-hidden="true">
                  {initial}
                </span>
                <span className={styles.accountName}>{name}</span>
              </span>
            ) : null}

            {typeof onLogout === 'function' ? (
              <button
                type="button"
                className={styles.logoutButton}
                onClick={onLogout}
              >
                {COPY.logout}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.welcome}>
          {name ? (
            <p className={styles.greeting}>
              {COPY.greetingPrefix}
              <strong className={styles.userName}>{name}</strong>
              {COPY.greetingSuffix}
            </p>
          ) : null}
          <h2 className={styles.systemTitle}>{COPY.systemTitle}</h2>
        </div>

        <div className={styles.dashboardSections}>
          <section className={styles.featuresSection}>
            <div className={styles.panelHead}>
              <p className={styles.sectionLabel}>{COPY.featuresSectionLabel}</p>
            </div>

            <div className={styles.grid}>
              {FEATURES.map(({ key, title, description }, index) => (
                <button
                  key={key}
                  type="button"
                  className={styles.card}
                  onClick={() => onNavigate(key)}
                >
                  <span className={styles.cardIndex} aria-hidden="true">
                    {formatStepIndex(index)}
                  </span>

                  <span className={styles.cardContent}>
                    <span className={styles.cardTitle}>{title}</span>
                    <span className={styles.cardDesc}>{description}</span>
                  </span>

                  <span className={styles.cardAction}>
                    {COPY.goTo}
                    <span className={styles.cardActionIcon} aria-hidden="true">
                      <ChevronIcon />
                    </span>
                  </span>
                </button>
              ))}
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
      </main>
    </div>
  );
}
