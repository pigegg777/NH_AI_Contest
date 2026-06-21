import { formatFieldDisplayValue, hasRenderableValue } from '../../model/cardFieldRenderModel';
import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function DataSelectionPreviewCard({ productRow, fields, index }) {
  const visibleFields = fields.filter((field) => hasRenderableValue(productRow?.[field.key]));

  return (
    <article className={styles.dataPreviewCard} data-testid={`data-selection-preview-card-${index}`}>
      {visibleFields.map((field) => (
        <p key={field.key} data-testid={`data-selection-preview-field-${field.key}-${index}`}>
          {formatFieldDisplayValue(field.key, productRow[field.key])}
        </p>
      ))}
    </article>
  );
}
