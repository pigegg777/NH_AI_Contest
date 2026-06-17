import { CARD_STYLE_FONT_SIZE_REM, normalizeCardStyle } from '../model/cardStyleModel';
import { STOREFRONT_FIELD_LABELS } from '../model/storefrontBuilderModel';
import styles from './CardGridSection.module.css';

function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (field === 'tax_price') {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()} won` : '';
  }

  return String(value);
}

function buildBadgeText(product) {
  return product?.medium_category || product?.large_category || product?.small_category || product?.detail_category || '';
}

export default function CardGridSection({ section, fields, style, sectionId }) {
  const products = Array.isArray(section?.products) ? section.products : [];
  const displayFields = Array.isArray(fields) && fields.length > 0 ? fields : ['product_name'];
  const title = section?.title || section?.productCategoryName || 'Products';
  const resolvedStyle = normalizeCardStyle(style);
  const cssVars = {
    '--card-accent': resolvedStyle.accentColor,
    '--card-font-size': CARD_STYLE_FONT_SIZE_REM[resolvedStyle.fontSize],
    '--card-columns': resolvedStyle.cardsPerRow,
  };

  return (
    <section
      id={sectionId}
      className={styles.section}
      style={cssVars}
      data-image-size={resolvedStyle.imageSize}
      data-image-fit={resolvedStyle.imageFit}
      data-card-radius={resolvedStyle.cardRadius}
      data-card-shadow={resolvedStyle.cardShadow}
      data-card-spacing={resolvedStyle.cardSpacing}
    >
      <h2 className={styles.title}>{title}</h2>
      <div className={`${styles.grid} ${styles[`layout-${resolvedStyle.layout}`]}`}>
        {products.map((product, index) => (
          <article
            key={product?.row_id || product?.product_code || `${product?.product_name ?? 'product'}-${product?.spec ?? index}`}
            className={styles.card}
          >
            <div className={styles.cardHeader}>
              <strong className={styles.cardName} title={product?.product_name || '-'}>
                {product?.product_name || '-'}
              </strong>
              {buildBadgeText(product) ? (
                <span className={styles.cardBadge} title={buildBadgeText(product)}>
                  {buildBadgeText(product)}
                </span>
              ) : null}
            </div>
            {product?.img_url && resolvedStyle.imageSize !== 'hidden' ? (
              <div className={styles.cardImageWrap}>
                <img className={styles.cardImage} src={product.img_url} alt={product?.product_name || ''} />
              </div>
            ) : null}
            <div className={styles.cardBody}>
              {displayFields
                .filter((field) => field !== 'img_url' && field !== 'product_name' && field !== 'medium_category')
                .map((field) => (
                  <div key={field} className={field === 'tax_price' ? styles.priceField : styles.field}>
                    <span className={styles.fieldLabel}>{STOREFRONT_FIELD_LABELS[field] || field}</span>
                    <span className={styles.fieldValue}>{formatFieldValue(field, product?.[field])}</span>
                  </div>
                ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
