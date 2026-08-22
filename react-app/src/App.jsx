import { Activity, useState } from 'react';

import AppLayout from './common/layouts/AppLayout';
import DashboardPage from './common/pages/DashboardPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import { useAppAuthState } from './features/auth/hooks/useAppAuthState';
import OfficeProductEditorPage from './features/office-product-editor/pages/OfficeProductEditorPage';
import PublicStorefrontPage from './features/public-storefront/pages/PublicStorefrontPage';
import StorefrontBuilderPage from './features/storefront/pages/StorefrontBuilderPage';

const OFFICE_PRODUCT_EDITOR_PAGE_KEY = 'office-product-editor';
const STOREFRONT_BUILDER_PAGE_KEY = 'storefront-builder';
const LEGACY_EXCEL_EXTRACT_TOOL_KEY = 'excel-extract';

const PUBLIC_TOOL_USER = {
  id: null,
  nh_name: 'NH',
  office_name: '비료정보 테스트',
  office_code: '',
};

function isDirectOfficeProductEditorEntry() {
  if (typeof window === 'undefined') {
    return false;
  }

  const tool = new URLSearchParams(window.location.search).get('tool');

  return (
    tool === OFFICE_PRODUCT_EDITOR_PAGE_KEY ||
    tool === LEGACY_EXCEL_EXTRACT_TOOL_KEY
  );
}

function isDirectStorefrontEntry() {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('tool') === 'store';
}

function getOfficeCodeFromQuery() {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get('office') ?? '';
}

function AuthLoadingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background:
          'linear-gradient(160deg, #e8f5ed 0%, #f4f2ef 55%, #eef4f0 100%)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '28px 24px',
          borderRadius: '16px',
          border: '1px solid #e2ddd8',
          background: '#ffffff',
          boxShadow: '0 12px 32px rgba(17, 24, 39, 0.1)',
          textAlign: 'center',
          color: '#1d4a2e',
          fontWeight: 700,
        }}
      >
        인증 상태 확인 중…
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('login');
  const [isStorefrontEntry] = useState(isDirectStorefrontEntry);
  const [isPublicToolMode] = useState(isDirectOfficeProductEditorEntry);
  const [activePage, setActivePage] = useState(
    isPublicToolMode ? OFFICE_PRODUCT_EDITOR_PAGE_KEY : 'dashboard',
  );
  const { user, isLoading, handleLogin, handleLogout } = useAppAuthState(
    !isPublicToolMode && !isStorefrontEntry,
  );

  if (isStorefrontEntry) {
    return <PublicStorefrontPage officeCode={getOfficeCodeFromQuery()} />;
  }

  if (isPublicToolMode) {
    return (
      <AppLayout
        user={PUBLIC_TOOL_USER}
        activePage={OFFICE_PRODUCT_EDITOR_PAGE_KEY}
        showBackButton={false}
      >
        <OfficeProductEditorPage
          user={PUBLIC_TOOL_USER}
          onGoHome={() => setActivePage('dashboard')}
        />
      </AppLayout>
    );
  }

  if (isLoading) {
    return <AuthLoadingPage />;
  }

  if (!user) {
    if (page === 'register') {
      return <RegisterPage onGoLogin={() => setPage('login')} />;
    }

    return (
      <LoginPage
        onLogin={(nextUser) => {
          handleLogin(nextUser);
          setActivePage('dashboard');
        }}
        onGoRegister={() => setPage('register')}
      />
    );
  }

  async function handleAppLogout() {
    await handleLogout();
    setPage('login');
    setActivePage('dashboard');
  }

  return (
    <AppLayout
      user={user}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={handleAppLogout}
    >
      {activePage === 'dashboard' && (
        <DashboardPage user={user} onNavigate={setActivePage} />
      )}
      <Activity
        mode={
          activePage === OFFICE_PRODUCT_EDITOR_PAGE_KEY ? 'visible' : 'hidden'
        }
      >
        <OfficeProductEditorPage
          user={user}
          onGoHome={() => setActivePage('dashboard')}
        />
      </Activity>
      {activePage === STOREFRONT_BUILDER_PAGE_KEY && (
        <StorefrontBuilderPage
          officeCode={user?.office_code ?? ''}
          nhName={user?.nh_name ?? ''}
          onGoHome={() => setActivePage('dashboard')}
        />
      )}
    </AppLayout>
  );
}
