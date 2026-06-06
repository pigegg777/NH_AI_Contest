import styles from './AppLayout.module.css';

const PAGE_LABELS = {
  fertilizer: '비료 정보',
  'excel-extract': '판매단가 분석',
};

function BackArrow() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4L6 10l6 6" />
    </svg>
  );
}

export default function AppLayout({ user, activePage, onNavigate, onLogout, children }) {
  const orgLabel = [user?.nh_name, user?.office_name].filter(Boolean).join(' · ');
  const isDashboard = activePage === 'dashboard';
  const pageLabel = PAGE_LABELS[activePage];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            {!isDashboard && (
              <button
                type="button"
                className={styles.backButton}
                onClick={() => onNavigate('dashboard')}
                aria-label="홈으로 돌아가기"
              >
                <BackArrow />
                홈
              </button>
            )}
            <div className={styles.logoBadge}>NH</div>
            <span className={styles.logoDivider} />
            {isDashboard ? (
              <span className={styles.logoText}>{orgLabel || '농협'}</span>
            ) : (
              <span className={styles.pageLabel}>{pageLabel}</span>
            )}
          </div>

          {typeof onLogout === 'function' && (
            <button type="button" className={styles.lockButton} onClick={onLogout}>
              로그아웃
            </button>
          )}
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
