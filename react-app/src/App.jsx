import { useState } from 'react';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ExcelExtractWorkbookReviewPage from './features/excel-extract/pages/ExcelExtractWorkbookReviewPage';
import FertilizerInfoPage from './features/fertilizer/pages/FertilizerInfoPage';
import AppLayout from './common/layouts/AppLayout';
import DashboardPage from './common/pages/DashboardPage';

const PUBLIC_TOOL_USER = {
  nh_name: 'NH',
  office_name: '비료정보 시스템',
};

function isDirectExcelExtractEntry() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('tool') === 'excel-extract';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [isPublicToolMode] = useState(isDirectExcelExtractEntry);
  const [activePage, setActivePage] = useState(isPublicToolMode ? 'excel-extract' : 'dashboard');

  if (isPublicToolMode) {
    return (
      <AppLayout
        user={PUBLIC_TOOL_USER}
        activePage={activePage}
        onNavigate={setActivePage}
      >
        {activePage === 'excel-extract' ? (
          <ExcelExtractWorkbookReviewPage onGoHome={() => setActivePage('dashboard')} />
        ) : (
          <FertilizerInfoPage />
        )}
      </AppLayout>
    );
  }

  if (!user) {
    if (page === 'register') {
      return <RegisterPage onGoLogin={() => setPage('login')} />;
    }
    return <LoginPage onLogin={setUser} onGoRegister={() => setPage('register')} />;
  }

  return (
    <AppLayout
      user={user}
      activePage={activePage}
      onNavigate={setActivePage}
      onLogout={() => { setUser(null); setActivePage('dashboard'); }}
    >
      {activePage === 'dashboard' && <DashboardPage user={user} onNavigate={setActivePage} />}
      {activePage === 'fertilizer' && <FertilizerInfoPage />}
      {activePage === 'excel-extract' && (
        <ExcelExtractWorkbookReviewPage onGoHome={() => setActivePage('dashboard')} />
      )}
    </AppLayout>
  );
}
