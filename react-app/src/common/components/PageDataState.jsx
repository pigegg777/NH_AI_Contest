import styles from './PageDataState.module.css';

export default function PageDataState({
  mode = 'loading',
  message = '데이터를 불러오는 중...',
}) {
  return (
    <div
      className={styles.wrap}
      role={mode === 'error' ? 'alert' : 'status'}
      aria-live={mode === 'error' ? 'assertive' : 'polite'}
    >
      {mode === 'loading' ? <div className={styles.spinner} aria-hidden /> : null}
      <p className={styles.text}>{message}</p>
    </div>
  );
}
