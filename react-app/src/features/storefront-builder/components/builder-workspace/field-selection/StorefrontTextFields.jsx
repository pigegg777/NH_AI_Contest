import { useId } from 'react';

import styles from './FieldSelectionDock.module.css';

/**
 * 필드 선택 독의 단일 행 입력. 지금은 페이지 제목 하나가 쓴다. 여러 줄 안내는
 * 반복 목록이 되어 InformationEntryFields 로 넘어갔으므로, 여기 남은 것은
 * 라벨·placeholder·힌트를 갖춘 한 줄 텍스트뿐이다.
 */
export function StorefrontTextFields({ fields, onChange }) {
  const idPrefix = useId().replace(/:/g, '-');

  return (
    <div className={styles.textFields} data-testid="storefront-text-fields">
      {fields.map((field) => {
        const inputId = `${idPrefix}-${field.id}`;

        return (
          <div key={field.id} className={styles.textField}>
            <label className={styles.textFieldLabel} htmlFor={inputId}>
              {field.label}
            </label>

            <div className={styles.textFieldRow}>
              <input
                id={inputId}
                type="text"
                className={styles.textFieldInput}
                value={field.value}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.id, event.target.value)}
              />
            </div>

            {field.hint ? (
              <p className={styles.textFieldHint}>{field.hint}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
