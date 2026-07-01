import { useRegisterForm } from '../hooks/useRegisterForm';
import styles from './LoginPage.module.css';

export default function RegisterPage({ onGoLogin }) {
  const { form, handleChange, handleSubmit, status, message } = useRegisterForm({
    onGoLogin,
  });

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
