import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import App from './App';
import { useAppAuthState } from './features/auth/hooks/useAppAuthState';

vi.mock('./features/auth/hooks/useAppAuthState', () => ({
  useAppAuthState: vi.fn(),
}));

vi.mock('./features/auth/pages/LoginPage', () => ({
  default: () => <div>login-page</div>,
}));

vi.mock('./features/auth/pages/RegisterPage', () => ({
  default: () => <div>register-page</div>,
}));

vi.mock('./features/excel-extract/pages/ExcelExtractWorkbookReviewPage', () => ({
  default: () => <div>excel-review-page</div>,
}));

vi.mock('./features/fertilizer/pages/FertilizerInfoPage', () => ({
  default: () => <div>fertilizer-page</div>,
}));

vi.mock('./common/layouts/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}));

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    useAppAuthState.mockReturnValue({
      user: null,
      isLoading: false,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('renders the login page by default', () => {
    render(<App />);

    expect(screen.getByText('login-page')).toBeInTheDocument();
    expect(screen.queryByText('excel-review-page')).not.toBeInTheDocument();
  });

  it('renders the auth loading state while bootstrapping a session', () => {
    useAppAuthState.mockReturnValue({
      user: null,
      isLoading: true,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText('인증 상태 확인 중…')).toBeInTheDocument();
  });

  it('renders the excel review page when tool=excel-extract is set', () => {
    window.history.replaceState({}, '', '/?tool=excel-extract');

    render(<App />);

    expect(screen.getByText('excel-review-page')).toBeInTheDocument();
    expect(screen.queryByText('login-page')).not.toBeInTheDocument();
  });
});
