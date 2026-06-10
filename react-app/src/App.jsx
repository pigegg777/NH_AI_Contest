import { useState } from 'react';

import AppLayout from './common/layouts/AppLayout';
import DashboardPage from './common/pages/DashboardPage';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import { useAppAuthState } from './features/auth/hooks/useAppAuthState';
import ExcelExtractWorkbookReviewPage from './features/excel-extract/pages/ExcelExtractWorkbookReviewPage';
import FertilizerInfoPage from './features/fertilizer/pages/FertilizerInfoPage';

const PUBLIC_TOOL_USER = {
  id: null,
  nh_name: 'NH',
  office_name: '비료정보 테스트',
  office_code: '',
};

function isDirectExcelExtractEntry() {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('tool') === 'excel-extract';
}

function AuthLoadingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, #e8f5ed 0%, #f4f2ef 55%, #eef4f0 100%)',
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
  const [isPublicToolMode] = useState(isDirectExcelExtractEntry);
  const [activePage, setActivePage] = useState(isPublicToolMode ? 'excel-extract' : 'dashboard');
  const { user, isLoading, handleLogin, handleLogout } = useAppAuthState(!isPublicToolMode);

  if (isPublicToolMode) {
    return (
      <AppLayout user={PUBLIC_TOOL_USER} activePage={activePage} onNavigate={setActivePage}>
        {activePage === 'excel-extract' ? (
          <ExcelExtractWorkbookReviewPage
            user={PUBLIC_TOOL_USER}
            onGoHome={() => setActivePage('dashboard')}
          />
        ) : (
          <FertilizerInfoPage />
        )}
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

  return (
    <AppLayout
      user={user}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={async () => {
        await handleLogout();
        setPage('login');
        setActivePage('dashboard');
      }}
    >
      {activePage === 'dashboard' && <DashboardPage user={user} onNavigate={setActivePage} />}
      {activePage === 'fertilizer' && <FertilizerInfoPage />}
      {activePage === 'excel-extract' && (
        <ExcelExtractWorkbookReviewPage user={user} onGoHome={() => setActivePage('dashboard')} />
      )}
    </AppLayout>
  );
}
