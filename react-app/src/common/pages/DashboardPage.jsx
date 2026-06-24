import styles from './DashboardPage.module.css';

const COPY = {
  dataEditorTitle: '판매 상품 데이터 설정/수정',
  dataEditorDescription:
    '생산경제시스템 31-6447에서 엑셀 추출 후 데이터를 등록해주세요',
  storefrontTitle: 'AI로 자재정보 페이지 만들기',
  storefrontDescription:
    '공개할 상품, 카드 구성, 페이지 문구를 AI 제안과 미리보기로 빠르게 완성하세요.',
  dashboard: '대시보드',
  logout: '로그아웃',
  greetingPrefix: '안녕하세요, ',
  greetingSuffix: '님',
  systemTitle: 'AI로 자재판매장 물품정보 페이지를 만들어보세요',
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
  const officeName = [user?.nh_name, user?.office_name]
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
          {officeCode || officeName ? (
            <div className={styles.officeSummary}>
              {officeName ? (
                <p className={styles.officeName}>{officeName}</p>
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
  );
}
