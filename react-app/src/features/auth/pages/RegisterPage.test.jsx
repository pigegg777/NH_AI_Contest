import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';

import RegisterPage from './RegisterPage';
import { register } from '../services/authService';

vi.mock('../services/authService', () => ({
  register: vi.fn(),
}));

describe('RegisterPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function fillRegisterForm(container) {
    fireEvent.change(container.querySelector('#nhName'), {
      target: { value: 'NH' },
    });
    fireEvent.change(container.querySelector('#officeName'), {
      target: { value: 'Main Office' },
    });
    fireEvent.change(container.querySelector('#businessCode'), {
      target: { value: 'A001' },
    });
    fireEvent.change(container.querySelector('#name'), {
      target: { value: 'User One' },
    });
    fireEvent.change(container.querySelector('#employeeId'), {
      target: { value: '1001' },
    });
    fireEvent.change(container.querySelector('#password'), {
      target: { value: 'secret' },
    });
  }

  it('submits the current-project business code field', async () => {
    register.mockResolvedValue({ status: 'success', authUserId: 'auth-user-1' });

    const onGoLogin = vi.fn();
    const { container } = render(<RegisterPage onGoLogin={onGoLogin} />);

    fillRegisterForm(container);
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ businessCode: 'A001' }),
      );
    });

    expect(container.querySelector('#businessCode')).toBeRequired();
  });

  it('shows a duplicate message when the employeeId is already registered', async () => {
    register.mockResolvedValue({ status: 'duplicate' });

    const { container, findByText } = render(<RegisterPage onGoLogin={vi.fn()} />);

    fillRegisterForm(container);
    fireEvent.submit(container.querySelector('form'));

    expect(
      await findByText('이미 가입된 사번입니다. 로그인 페이지에서 비밀번호를 확인해 주세요.'),
    ).toBeInTheDocument();
  });
});
