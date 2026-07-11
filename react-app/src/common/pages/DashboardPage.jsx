import PublicStorefrontQrCard from '../components/PublicStorefrontQrCard';
import styles from './DashboardPage.module.css';

const COPY = {
  dataEditorTitle: '상품 데이터입력',
  dataEditorDescription:
    '업로드된 원본 데이터에서 고객에게 보여줄 상품 정보를 정리하고 저장합니다.',
  storefrontTitle: 'AI로 상품페이지 만들기',
  storefrontDescription:
    '공개 상품 페이지의 카드 구성과 문구를 AI와 함께 빠르게 다듬습니다.',
  dashboard: '대시보드',
  logout: '로그아웃',
  greetingPrefix: '안녕하세요, ',
  greetingSuffix: '님.',
  systemTitle: 'AI로 고객용 상품 페이지를 만들고 배포해 보세요',
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

export default function DashboardPage({ user, onNavigate, onLogout }) {
  const name = user?.name;
  const officeCode = user?.office_code?.trim();
  const officeLabel = [user?.nh_name, user?.office_name]
    .filter(Boolean)
    .join(COPY.orgSeparator);

  return (
    <div className={styles.page}>
      <div className={styles.navbar}>
        <div className={styles.navbarInner}>
          <h1 className={styles.navbarTitle}>{COPY.dashboard}</h1>
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

      <div className={styles.content}>
        <div className={styles.welcome}>
          {officeCode || officeLabel ? (
            <div className={styles.officeSummary}>
              {officeLabel ? (
                <p className={styles.officeName}>{officeLabel}</p>
              ) : null}
            </div>
          ) : null}
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
          <PublicStorefrontQrCard
            officeCode={officeCode}
            officeName={user?.office_name}
            nhName={user?.nh_name}
          />

          <div className={styles.grid}>
            {FEATURES.map(({ key, title, description }) => (
              <button
                key={key}
                type="button"
                className={styles.card}
                onClick={() => onNavigate(key)}
              >
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <p className={styles.cardDesc}>{description}</p>
                </div>
                <span className={styles.cardAction}>{COPY.goTo}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
