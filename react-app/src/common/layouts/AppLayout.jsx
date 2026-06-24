import styles from './AppLayout.module.css';

const PAGE_LABELS = {
  'office-product-editor': '데이터 설정/수정',
  'storefront-builder': 'AI 페이지 만들기',
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

export default function AppLayout({
  activePage,
  onNavigate,
  onLogout,
  showBackButton = true,
  children,
}) {
  const isDashboard = activePage === 'dashboard';
  const pageLabel = PAGE_LABELS[activePage];
  const shouldShowHeader = !isDashboard;
  const canGoHome =
    !isDashboard && showBackButton && typeof onNavigate === 'function';

  return (
    <div className={styles.shell}>
      {shouldShowHeader ? (
        <header
          className={[
            styles.header,
            isDashboard ? styles.headerDashboard : '',
          ].join(' ')}
        >
          <div
            className={[
              styles.headerInner,
              isDashboard ? styles.headerInnerDashboard : '',
            ].join(' ')}
          >
            {!isDashboard ? (
              <div className={styles.logo}>
                {canGoHome ? (
                  <>
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={() => onNavigate('dashboard')}
                      aria-label="홈으로 돌아가기"
                    >
                      <BackArrow />
                      홈으로
                    </button>

                    <span className={styles.logoDivider} />
                  </>
                ) : null}
                <span className={styles.pageLabel}>{pageLabel}</span>
              </div>
            ) : null}

            {typeof onLogout === 'function' ? (
              <button
                type="button"
                className={styles.lockButton}
                onClick={onLogout}
              >
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
