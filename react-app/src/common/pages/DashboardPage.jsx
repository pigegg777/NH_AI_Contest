import styles from './DashboardPage.module.css';

const COPY = {
  dataEditorTitle: '\ub370\uc774\ud130 \uc124\uc815/\uc218\uc815',
  dataEditorDescription:
    '\uc5d1\uc140 \ud30c\uc77c\uc5d0\uc11c \ud310\ub9e4\ub2e8\uac00\ub97c \uc790\ub3d9\uc73c\ub85c \ucd94\ucd9c\ud558\uace0 \ub370\uc774\ud130\ub97c \uc124\uc815\u00b7\uc218\uc815\ud558\uc138\uc694.',
  storefrontTitle: 'AI \uc2a4\ud1a0\uc5b4 \ud398\uc774\uc9c0 \ub9cc\ub4e4\uae30',
  storefrontDescription:
    '\uacf5\uac1c\ud560 \uc0c1\ud488, \uce74\ub4dc \uad6c\uc131, \ud398\uc774\uc9c0 \ubb38\uad6c\ub97c AI \uc81c\uc548\uacfc \ubbf8\ub9ac\ubcf4\uae30\ub85c \ube60\ub974\uac8c \uc644\uc131\ud558\uc138\uc694.',
  dashboard: '\ub300\uc2dc\ubcf4\ub4dc',
  logout: '\ub85c\uadf8\uc544\uc6c3',
  greetingPrefix: '\uc548\ub155\ud558\uc138\uc694, ',
  greetingSuffix: '\ub2d8',
  systemTitle: '\ubb34\uc5c7\uc744 \ub3c4\uc640\ub4dc\ub9b4\uae4c\uc694?',
  goTo: '\ubc14\ub85c\uac00\uae30',
  orgSeparator: ' \u00b7 ',
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
              {officeCode ? (
                <span className={styles.officeCode} translate="no">
                  {officeCode}
                </span>
              ) : null}
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
