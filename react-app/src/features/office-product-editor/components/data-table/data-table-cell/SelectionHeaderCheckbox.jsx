import { useEffect, useRef } from 'react';

import styles from './SelectionHeaderCheckbox.module.css';

export function SelectionHeaderCheckbox({ checked, indeterminate, onChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={styles.selectionHeaderLabel}>
      <span className={styles.selectionHeaderText}>숨길 상품 표시</span>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        className={styles.shadowCheckbox}
        onChange={onChange}
      />
    </label>
  );
}
