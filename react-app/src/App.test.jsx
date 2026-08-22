import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('./features/office-product-editor/pages/OfficeProductEditorPage', () => ({
  default: () => <div>office-product-editor-page</div>,
}));

vi.mock('./features/public-storefront/pages/PublicStorefrontPage', () => ({
  default: ({ officeCode }) => <div>public-storefront-page:{officeCode}</div>,
}));

vi.mock('./common/components/PublicStorefrontQrCard', () => ({
  default: () => <div data-testid="dashboard-public-storefront-qr-card" />,
}));

vi.mock('./features/storefront/pages/StorefrontBuilderPage', () => ({
  default: ({ officeCode }) => <div>storefront-builder-page:{officeCode}</div>,
}));

vi.mock('./common/layouts/AppLayout', () => ({
  default: ({ children, onLogout }) => (
    <div data-testid="app-layout">
      {typeof onLogout === 'function' ? (
        <button type="button" onClick={onLogout}>
          로그아웃
        </button>
      ) : null}
      {children}
    </div>
  ),
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
    expect(
      screen.queryByText('office-product-editor-page'),
    ).not.toBeInTheDocument();
  });

  it('renders the auth loading state while bootstrapping a session', () => {
    useAppAuthState.mockReturnValue({
      user: null,
      isLoading: true,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText(/인증 상태 확인 중/)).toBeInTheDocument();
  });

  it('renders the office product editor page when tool=office-product-editor is set', () => {
    window.history.replaceState({}, '', '/?tool=office-product-editor');

    render(<App />);

    expect(screen.getByText('office-product-editor-page')).toBeInTheDocument();
    expect(screen.queryByText('login-page')).not.toBeInTheDocument();
  });

  it('keeps the legacy tool=excel-extract entry working', () => {
    window.history.replaceState({}, '', '/?tool=excel-extract');

    render(<App />);

    expect(screen.getByText('office-product-editor-page')).toBeInTheDocument();
  });

  it('renders the public storefront standalone, without AppLayout, when tool=store is set', () => {
    window.history.replaceState({}, '', '/?tool=store&office=OFF-1');

    render(<App />);

    expect(screen.getByText('public-storefront-page:OFF-1')).toBeInTheDocument();
    expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
    expect(screen.queryByText('login-page')).not.toBeInTheDocument();
  });

  it('navigates to the storefront builder from the dashboard for logged-in users', async () => {
    const user = userEvent.setup();

    useAppAuthState.mockReturnValue({
      user: {
        id: 1,
        name: 'Kim',
        nh_name: 'NH',
        office_name: 'Gangnam',
        office_code: 'OFF-1',
      },
      isLoading: false,
      handleLogin: vi.fn(),
      handleLogout: vi.fn(),
    });

    render(<App />);

    await user.click(
      screen.getByRole('button', { name: /AI로 상품페이지 만들기/ }),
    );

    expect(screen.getByText('storefront-builder-page:OFF-1')).toBeInTheDocument();
  });

  it('wires the layout logout button to handleLogout for logged-in users', async () => {
    const user = userEvent.setup();
    const handleLogout = vi.fn().mockResolvedValue(undefined);

    useAppAuthState.mockReturnValue({
      user: {
        id: 1,
        name: 'Kim',
        nh_name: 'NH',
        office_name: 'Gangnam',
        office_code: 'OFF-1',
      },
      isLoading: false,
      handleLogin: vi.fn(),
      handleLogout,
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(handleLogout).toHaveBeenCalledTimes(1);
  });
});
