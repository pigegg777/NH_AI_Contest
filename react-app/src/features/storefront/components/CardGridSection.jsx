import { CARD_STYLE_FONT_SIZE_REM, normalizeCardStyle } from '../model/cardStyleModel';
import { STOREFRONT_FIELD_LABELS, sortFieldKeysByDisplayOrder } from '../model/storefrontBuilderModel';
import { deriveCardElementConfig } from '../model/storefrontUiModel';
import styles from './CardGridSection.module.css';

const PRICE_FIELD_SET = new Set(['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy']);

function renderFieldValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'object') {
    return '';
  }

  if (PRICE_FIELD_SET.has(field)) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()}원` : '';
  }

  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return (
      <a href={value} className={styles.fieldValueLink} target="_blank" rel="noreferrer">
        보기
      </a>
    );
  }

  return String(value);
}

export default function CardGridSection({
  section,
  fields,
  style,
  sectionId,
  sectionHeaderContent = null,
}) {
  const products = Array.isArray(section?.products) ? section.products : [];
  const displayFields = Array.isArray(fields) && fields.length > 0 ? fields : ['product_name'];
  const title = section?.title || section?.productCategoryName || '상품';
  const elementConfig = deriveCardElementConfig(displayFields, style, section?.elementConfig);
  const resolvedStyle = normalizeCardStyle({
    ...(style ?? {}),
    imageSize: elementConfig.showImage ? elementConfig.imageSize : 'hidden',
    imageFit: elementConfig.imageFit,
  });
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
      data-meta-density={elementConfig.metaDensity}
    >
      <h2 className={styles.title}>{title}</h2>
      {sectionHeaderContent ? <div className={styles.sectionHeaderContent}>{sectionHeaderContent}</div> : null}
      <div className={`${styles.grid} ${styles[`layout-${resolvedStyle.layout}`]}`}>
        {products.map((product, index) => (
            <article
              key={product?.row_id || product?.product_code || `${product?.product_name ?? 'product'}-${product?.spec ?? index}`}
              className={styles.card}
            >
              {elementConfig.showProductName ? (
                <div className={styles.cardHeader}>
                  <strong className={styles.cardName} title={product?.product_name || '-'}>
                    {product?.product_name || '-'}
                  </strong>
                </div>
              ) : null}

              {product?.img_url && elementConfig.showImage && resolvedStyle.imageSize !== 'hidden' ? (
                <div className={styles.cardImageWrap}>
                  <img className={styles.cardImage} src={product.img_url} alt={product?.product_name || ''} />
                </div>
              ) : null}

              <div className={styles.cardBody}>
                {sortFieldKeysByDisplayOrder(
                  displayFields
                    .filter((field) => field !== 'img_url' && field !== 'product_name' && field !== 'medium_category')
                    .filter((field) => {
                      if (field === 'spec') return elementConfig.showSpec;
                      if (field === 'nutrient') return elementConfig.showNutrient;
                      if (PRICE_FIELD_SET.has(field)) return elementConfig.showPrice;
                      return true;
                    })
                    .filter((field) => {
                      if (PRICE_FIELD_SET.has(field)) return renderFieldValue(field, product?.[field]) !== '';
                      return true;
                    }),
                ).map((field) => (
                  <div key={field} className={PRICE_FIELD_SET.has(field) ? styles.priceField : styles.field}>
                    <span className={styles.fieldLabel}>{STOREFRONT_FIELD_LABELS[field] || field}</span>
                    <span className={styles.fieldValue}>{renderFieldValue(field, product?.[field])}</span>
                  </div>
                ))}
              </div>
            </article>
        ))}
      </div>
    </section>
  );
}
