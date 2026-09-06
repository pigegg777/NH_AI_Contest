import styles from './EmptyState.module.css';

export default function EmptyState({
  message = '데이터가 없습니다.',
  className = '',
}) {
  return <div className={[styles.empty, className].filter(Boolean).join(' ')}>{message}</div>;
}
