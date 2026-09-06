import searchIconUrl from '../assets/nongyak/search-icon.png';
import styles from './SearchInput.module.css';

export default function SearchInput({
  className = '',
  value,
  onChange,
  placeholder = '검색어 입력',
  ...inputProps
}) {
  const wrapClassName = [styles.wrap, className].filter(Boolean).join(' ');

  return (
    <div className={wrapClassName}>
      <input
        {...inputProps}
        className={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type="search"
      />
      <img
        src={searchIconUrl}
        alt=""
        aria-hidden="true"
        className={styles.icon}
      />
    </div>
  );
}
