import { useState } from 'react';
import LoginPage from './features/auth/pages/LoginPage';
import RegisterPage from './features/auth/pages/RegisterPage';
import ExcelExtractWorkbookReviewPage from './features/excel-extract/pages/ExcelExtractWorkbookReviewPage';
import FertilizerInfoPage from './features/fertilizer/pages/FertilizerInfoPage';
import AppLayout from './common/layouts/AppLayout';

function getInitialPage() {
  if (typeof window === 'undefined') return 'fertilizer';
  return new URLSearchParams(window.location.search).get('tool') === 'excel-extract'
    ? 'excel-extract'
    : 'fertilizer';
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');
  const [activePage, setActivePage] = useState(getInitialPage);

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
      onLogout={() => setUser(null)}
    >
      {activePage === 'excel-extract' ? <ExcelExtractWorkbookReviewPage /> : <FertilizerInfoPage />}
    </AppLayout>
  );
}
