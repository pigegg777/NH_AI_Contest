import { useId } from 'react';

import styles from './FieldSelectionDock.module.css';

export const PAGE_DESCRIPTION_PLACEHOLDER = '영세가격 : 농업경영체 등록자 구매가격';

/**
 * The free-text side of the field selection dock: page title, page description
 * and per-category description. Kept apart from the field tables because it
 * edits config text rather than toggling which columns a card shows.
 */
export function StorefrontTextFields({ fields, onChange }) {
  const idPrefix = useId().replace(/:/g, '-');

  return (
    <div className={styles.textFields} data-testid="storefront-text-fields">
      {fields.map((field) => {
        const inputId = `${idPrefix}-${field.id}`;
        // Offering to fill text the merchant has already written would only
        // risk clobbering it.
        const showsFill = Boolean(field.fillLabel) && !field.value;

        return (
          <div key={field.id} className={styles.textField}>
            <label className={styles.textFieldLabel} htmlFor={inputId}>
              {field.label}
            </label>

            <div className={styles.textFieldRow}>
              {field.multiline ? (
                <textarea
                  id={inputId}
                  className={`${styles.textFieldInput} ${styles.textFieldTextarea}`}
                  value={field.value}
                  placeholder={field.placeholder}
                  rows={3}
                  onChange={(event) => onChange(field.id, event.target.value)}
                />
              ) : (
                <input
                  id={inputId}
                  type="text"
                  className={styles.textFieldInput}
                  value={field.value}
                  placeholder={field.placeholder}
                  onChange={(event) => onChange(field.id, event.target.value)}
                />
              )}

              {showsFill ? (
                <button
                  type="button"
                  className={styles.textFieldFillButton}
                  onClick={() => onChange(field.id, field.placeholder)}
                >
                  {field.fillLabel}
                </button>
              ) : null}
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
