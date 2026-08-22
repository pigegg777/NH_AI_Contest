import nhCyberSymbolUrl from '../assets/nh_cyber_symbol.png';
import styles from './AppLayout.module.css';

const BRAND_NAME = 'NH AI Agent';
const ORG_SEPARATOR = ' · ';

const NAV_ITEMS = [
  { key: 'office-product-editor', label: '데이터 설정/수정' },
  { key: 'storefront-builder', label: 'AI 페이지 만들기' },
];

function BrandContent() {
  return (
    <>
      <span className={styles.brandMark} aria-hidden="true">
        <img className={styles.brandSymbol} src={nhCyberSymbolUrl} alt="" />
      </span>
      <span className={styles.brandTitle}>{BRAND_NAME}</span>
    </>
  );
}

export default function AppLayout({
  user,
  activePage,
  onNavigate,
  onLogout,
  showBackButton = true,
  children,
}) {
  const isDashboard = activePage === 'dashboard';
  const canNavigate = showBackButton && typeof onNavigate === 'function';
  const name = user?.name;
  const initial = name?.trim().charAt(0) ?? '';
  const officeLabel = [user?.nh_name, user?.office_name]
    .filter(Boolean)
    .join(ORG_SEPARATOR);

  return (
    <div
      className={[styles.shell, isDashboard ? styles.shellNarrow : ''].join(' ')}
    >
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            {canNavigate ? (
              <button
                type="button"
                className={styles.brandButton}
                onClick={() => onNavigate('dashboard')}
                aria-label="홈으로 돌아가기"
              >
                <BrandContent />
              </button>
            ) : (
              <span className={styles.brandStatic}>
                <BrandContent />
              </span>
            )}

            {canNavigate ? (
              <>
                <span className={styles.navDivider} aria-hidden="true" />

                <nav className={styles.nav} aria-label="주요 기능">
                  {NAV_ITEMS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={[
                        styles.navLink,
                        activePage === key ? styles.navLinkActive : '',
                      ].join(' ')}
                      aria-current={activePage === key ? 'page' : undefined}
                      onClick={() => onNavigate(key)}
                    >
                      {label}
                    </button>
                  ))}
                </nav>
              </>
            ) : null}
          </div>

          <div className={styles.actions}>
            {officeLabel ? (
              <span className={styles.office}>{officeLabel}</span>
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
                로그아웃
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
