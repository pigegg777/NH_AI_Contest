import { useEffect, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { register } from '../services/authService';
import styles from './LoginPage.module.css';

const DUPLICATE_REGISTER_MESSAGE = '이미 가입된 사번입니다. 로그인 페이지에서 비밀번호를 확인해 주세요.';
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

export default function RegisterPage({ onGoLogin }) {
  const [form, setForm] = useState({
    nhName: '',
    officeName: '',
    businessCode: '',
    name: '',
    employeeId: '',
    password: '',
  });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

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

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    setMessage('');
    setStatus('idle');
  }

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
        setMessage('입력값을 모두 확인해 주세요.');
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>NH</div>
          <h1 className={styles.title}>계정 등록</h1>
        </div>
        <hr className={styles.divider} />

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="nhName">
              농협명
            </label>
            <input
              id="nhName"
              name="nhName"
              className={styles.input}
              value={form.nhName}
              onChange={handleChange}
              autoComplete="organization"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="officeName">
              사무소명
            </label>
            <input
              id="officeName"
              name="officeName"
              className={styles.input}
              value={form.officeName}
              onChange={handleChange}
              autoComplete="organization-title"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="businessCode">
              사업장 코드
            </label>
            <input
              id="businessCode"
              name="businessCode"
              className={styles.input}
              value={form.businessCode}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              이름
            </label>
            <input
              id="name"
              name="name"
              className={styles.input}
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="employeeId">
              사번
            </label>
            <input
              id="employeeId"
              name="employeeId"
              className={styles.input}
              value={form.employeeId}
              onChange={handleChange}
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={styles.input}
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={status === 'submitting'}>
            {status === 'submitting' ? '가입 처리 중…' : '가입하기'}
          </button>

          {message ? (
            <p
              className={status === 'success' ? styles.success : styles.error}
              aria-live="polite"
            >
              {message}
            </p>
          ) : null}
        </form>

        <button type="button" className={styles.linkButton} onClick={onGoLogin}>
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </div>
  );
}
