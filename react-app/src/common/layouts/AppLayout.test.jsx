import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AppLayout from './AppLayout';

const USER = {
  id: 1,
  name: '김담당',
  nh_name: 'NH',
  office_name: '강남지점',
  office_code: 'OFF-1',
};

function renderLayout(props = {}) {
  return render(
    <AppLayout user={USER} activePage="dashboard" {...props}>
      <div>page-body</div>
    </AppLayout>,
  );
}

describe('AppLayout', () => {
  afterEach(cleanup);

  it('shows the same brand, office and account block on every page', () => {
    renderLayout({ activePage: 'office-product-editor' });

    expect(screen.getByText('NH AI Agent')).toBeInTheDocument();
    expect(screen.getByText('NH · 강남지점')).toBeInTheDocument();
    expect(screen.getByText('김담당')).toBeInTheDocument();
  });

  it('marks the nav link of the active page and leaves the other one unmarked', () => {
    renderLayout({ activePage: 'storefront-builder', onNavigate: vi.fn() });

    expect(
      screen.getByRole('button', { name: 'AI 페이지 만들기' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('button', { name: '데이터 설정/수정' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('navigates straight between feature pages without passing through the dashboard', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    renderLayout({ activePage: 'office-product-editor', onNavigate });

    await user.click(screen.getByRole('button', { name: 'AI 페이지 만들기' }));

    expect(onNavigate).toHaveBeenCalledWith('storefront-builder');
  });

  it('sends the brand button back to the dashboard', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    renderLayout({ activePage: 'office-product-editor', onNavigate });

    await user.click(screen.getByRole('button', { name: '홈으로 돌아가기' }));

    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('hides navigation in public tool mode so the brand is not clickable', () => {
    renderLayout({
      activePage: 'office-product-editor',
      onNavigate: vi.fn(),
      showBackButton: false,
    });

    expect(screen.getByText('NH AI Agent')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '홈으로 돌아가기' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'AI 페이지 만들기' }),
    ).not.toBeInTheDocument();
  });

  it('omits the logout button when no logout handler is given', () => {
    renderLayout();

    expect(
      screen.queryByRole('button', { name: '로그아웃' }),
    ).not.toBeInTheDocument();
  });
});
