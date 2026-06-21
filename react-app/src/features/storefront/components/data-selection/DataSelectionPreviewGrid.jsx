import DataSelectionPreviewCard from './DataSelectionPreviewCard';
import styles from '../../pages/StorefrontBuilderPage.module.css';

export default function DataSelectionPreviewGrid({ productRows, fields }) {
  const rows = Array.isArray(productRows) ? productRows : [];

  return (
    <div className={styles.dataPreviewGrid} data-testid="data-selection-preview-grid">
      {rows.map((productRow, index) => (
        <DataSelectionPreviewCard key={`${productRow?.product_name ?? 'row'}-${index}`} productRow={productRow} fields={fields} index={index} />
      ))}
    </div>
  );
}
