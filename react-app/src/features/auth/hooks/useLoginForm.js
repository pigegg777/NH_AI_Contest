import { useState } from 'react';

import { login } from '../services/authService';
import { useAuthFormFields } from './useAuthFormFields';

const INITIAL_LOGIN_FORM = {
  employeeId: '',
  password: '',
};
const LOGIN_ERROR_MESSAGE = '사번 또는 비밀번호를 확인해 주세요.';
const LOGIN_REQUEST_ERROR_MESSAGE = '로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';

export function useLoginForm({ onLogin }) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { form, handleChange } = useAuthFormFields(INITIAL_LOGIN_FORM, () => {
    setErrorMessage('');
  });

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await login(form);

      if (!user) {
        setErrorMessage(LOGIN_ERROR_MESSAGE);
        return;
      }

      onLogin(user);
    } catch (error) {
      console.error('[Auth] Failed to sign in.', error);
      setErrorMessage(LOGIN_REQUEST_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    form,
    handleChange,
    handleSubmit,
    errorMessage,
    isSubmitting,
  };
}
