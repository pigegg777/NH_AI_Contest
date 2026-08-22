import styles from './LinkCell.module.css';

export function LinkCell({ href, ariaLabel }) {
  if (!href) {
    return <span>-</span>;
  }

  return (
    <a href={href} aria-label={ariaLabel} className={styles.tableLink} target="_blank" rel="noreferrer">
      바로가기
    </a>
  );
}
