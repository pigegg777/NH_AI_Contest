import { useEffect, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { register } from '../services/authService';
import { useAuthFormFields } from './useAuthFormFields';

const INITIAL_REGISTER_FORM = {
  nhName: '',
  officeName: '',
  businessCode: '',
  name: '',
  employeeId: '',
  password: '',
};
const DUPLICATE_REGISTER_MESSAGE = '이미 가입된 사번입니다. 로그인 페이지에서 비밀번호를 확인해 주세요.';
const INVALID_REGISTER_MESSAGE = '입력값을 모두 확인해 주세요.';
const REGISTER_ERROR_MESSAGE = '회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
const REGISTER_SUCCESS_MESSAGE = '회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.';

function formatRegisterError(error) {
  const message = toTrimmedString(error?.message);

  if (/database error saving new user|database error creating new user|unexpected_failure/i.test(message)) {
    return 'Supabase Auth 트리거 또는 login_users 테이블 구조가 현재 회원가입 로직과 맞지 않습니다. 기존 프로젝트라면 auth 마이그레이션 SQL을 먼저 적용해 주세요.';
  }

  if (/email signups are disabled/i.test(message)) {
    return 'Supabase 대시보드에서 Email 회원가입이 비활성화되어 있습니다. Auth > Providers > Email 설정을 확인해 주세요.';
  }

  return message || REGISTER_ERROR_MESSAGE;
}

export function useRegisterForm({ onGoLogin }) {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const { form, handleChange } = useAuthFormFields(INITIAL_REGISTER_FORM, () => {
    setMessage('');
    setStatus('idle');
  });

  useEffect(() => {
    if (status !== 'success') {
      return undefined;
    }

    const timeoutId = globalThis.setTimeout(() => {
      onGoLogin();
    }, 1500);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [onGoLogin, status]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('submitting');
    setMessage('');

    try {
      const result = await register(form);

      if (result?.status === 'duplicate') {
        setStatus('error');
        setMessage(DUPLICATE_REGISTER_MESSAGE);
        return;
      }

      if (result?.status === 'invalid') {
        setStatus('error');
        setMessage(INVALID_REGISTER_MESSAGE);
        return;
      }

      setStatus('success');
      setMessage(REGISTER_SUCCESS_MESSAGE);
    } catch (error) {
      console.error('[Auth] Failed to sign up.', error);
      setStatus('error');
      setMessage(formatRegisterError(error));
    }
  }

  return {
    form,
    handleChange,
    handleSubmit,
    status,
    message,
  };
}
