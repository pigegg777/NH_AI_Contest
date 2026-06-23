import { isMandatoryField } from '../../model/dataSelectionFieldGroupModel';
import { formatFieldDisplayValue } from '../../model/cardFieldRenderModel';
import styles from './DataFieldGroupTable.module.css';

function isFieldVisible(draftFields, field) {
  const keys = field.aliasKeys ?? [field.key];
  return keys.some((key) => draftFields.includes(key));
}

export default function DataFieldGroupTable({
  groupLabel,
  fields,
  draftFields,
  onToggleField,
  testId,
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <div className={styles.fieldTableWrap}>
      <h4 className={styles.sectionTitle}>{groupLabel}</h4>
      <table className={styles.fieldTable} data-testid={testId}>
        <thead>
          <tr>
            <th scope="col">필드</th>
            <th scope="col">예시 값</th>
            <th scope="col">표시 여부</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const isVisible = isFieldVisible(draftFields, field);
            const isLocked = isMandatoryField(field.key);
            const exampleDisplay = formatFieldDisplayValue(
              field.key,
              field.exampleValue,
            );

            return (
              <tr key={field.key} data-testid={`data-field-row-${field.key}`}>
                <th scope="row" className={styles.fieldTableHeading}>
                  {field.label}
                </th>
                <td className={styles.fieldTableValueCell}>
                  <span
                    className={styles.fieldTableValue}
                    data-testid={`data-field-example-${field.key}`}
                  >
                    {exampleDisplay || '-'}
                  </span>
                </td>
                <td className={styles.fieldTableToggleCell}>
                  {field.isSelectable ? (
                    <label className={styles.fieldToggle}>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        disabled={isLocked}
                        data-testid={`data-field-toggle-${field.key}`}
                        onChange={() => onToggleField(field)}
                      />
                      <span>{isVisible ? '표시' : '숨김'}</span>
                    </label>
                  ) : (
                    <span
                      className={styles.fieldDisabled}
                      title="배열 또는 객체 값은 카드에 직접 표시할 수 없습니다."
                    >
                      선택 불가
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
