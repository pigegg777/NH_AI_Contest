export class ReviewTableAnnotationModel {
  constructor(rows, annotations) {
    this.rows = rows;
    this.annotations = annotations;
  }

  mergeRowsWithAnnotations() {
    return this.rows.map((row) => {
      const annotation =
        typeof row?.row_id === 'string' && row.row_id !== ''
          ? (this.annotations[row.row_id] ?? { shadow: false, note: '' })
          : { shadow: false, note: '' };

      return {
        ...row,
        shadow: annotation.shadow === true,
        note: typeof annotation.note === 'string' ? annotation.note : '',
        tax_price: Number.isFinite(annotation.tax_price)
          ? annotation.tax_price
          : row.tax_price,
        zero_tax_price: Number.isFinite(annotation.zero_tax_price)
          ? annotation.zero_tax_price
          : row.zero_tax_price,
        exempt_tax_price: Number.isFinite(annotation.exempt_tax_price)
          ? annotation.exempt_tax_price
          : row.exempt_tax_price,
      };
    });
  }
}
