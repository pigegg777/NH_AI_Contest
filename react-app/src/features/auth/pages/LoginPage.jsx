import { useLoginForm } from '../hooks/useLoginForm';
import styles from './LoginPage.module.css';

export default function LoginPage({ onLogin, onGoRegister }) {
  const { form, handleChange, handleSubmit, errorMessage, isSubmitting } = useLoginForm({
    onLogin,
  });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.badge}>NH</div>
          <h1 className={styles.title}>NH 비료정보 시스템</h1>
        </div>
        <hr className={styles.divider} />

        <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>

          {errorMessage ? (
            <p className={styles.error} aria-live="polite">
              {errorMessage}
            </p>
          ) : null}
        </form>

        <button type="button" className={styles.linkButton} onClick={onGoRegister}>
          계정이 없으신가요? 회원가입
        </button>
      </div>
    </div>
  );
}
