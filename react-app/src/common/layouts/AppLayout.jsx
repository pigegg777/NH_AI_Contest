import styles from './AppLayout.module.css';

const PAGE_LABELS = {
  fertilizer: '농자재 정보',
  'excel-extract': '데이터 설정/수정',
};

function BackArrow() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4L6 10l6 6" />
    </svg>
  );
}

export default function AppLayout({ activePage, onNavigate, onLogout, children }) {
  const isDashboard = activePage === 'dashboard';
  const pageLabel = PAGE_LABELS[activePage];
  const shouldShowHeader = !isDashboard || typeof onLogout === 'function';

  return (
    <div className={styles.shell}>
      {shouldShowHeader ? (
        <header className={[styles.header, isDashboard ? styles.headerDashboard : ''].join(' ')}>
          <div
            className={[
              styles.headerInner,
              isDashboard ? styles.headerInnerDashboard : '',
            ].join(' ')}
          >
            {!isDashboard ? (
              <div className={styles.logo}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => onNavigate('dashboard')}
                  aria-label="홈으로 돌아가기"
                >
                  <BackArrow />
                  홈
                </button>
                <div className={styles.logoBadge}>NH</div>
                <span className={styles.logoDivider} />
                <span className={styles.pageLabel}>{pageLabel}</span>
              </div>
            ) : null}

            {typeof onLogout === 'function' ? (
              <button type="button" className={styles.lockButton} onClick={onLogout}>
                로그아웃
              </button>
            ) : null}
          </div>
        </header>
      ) : null}

      <main className={styles.main}>{children}</main>
    </div>
  );
}
