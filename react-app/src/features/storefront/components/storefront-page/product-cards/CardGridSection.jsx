import { normalizeCardStyle } from '../../../model/card-design/style/cardStyleModel';
import { resolveSectionOrderFromLayoutPlan } from '../../../model/card-design/style/cardCompositionModel';
import { buildResolvedInfoSlots } from '../../../model/card-grid-section/cardGridSlotModel';
import { buildShellCssVars } from '../../../model/card-grid-section/cardGridFieldStyleModel';
import ProductCard from './ProductCard';
import styles from './CardGridSection.module.css';

function resolveCardKey(product, index) {
  return (
    product?.row_id ||
    product?.product_code ||
    `${product?.product_name ?? 'product'}-${product?.spec ?? index}`
  );
}

export default function CardGridSection({
  section,
  fields,
  cardStyle,
  bodySlots = [],
  sectionId,
  sectionHeaderContent = null,
  description = '',
}) {
  const products = Array.isArray(section?.products) ? section.products : [];
  const visibleFields =
    Array.isArray(fields) && fields.length > 0 ? fields : ['product_name'];
  const resolvedStyle = normalizeCardStyle(cardStyle);
  const sectionOrder = resolveSectionOrderFromLayoutPlan(
    resolvedStyle.layoutPlan,
    resolvedStyle.titleMode,
  );
  const infoSlots = buildResolvedInfoSlots(visibleFields, bodySlots);
  const canShowImage =
    visibleFields.includes('img_url') && sectionOrder.includes('image');
  const cssVars = {
    '--card-columns': resolvedStyle.cardsPerRow,
    ...buildShellCssVars(resolvedStyle),
  };

  return (
    <section
      id={sectionId}
      className={styles.section}
      style={cssVars}
      data-testid="storefront-card-grid-section"
      data-structural-preset={resolvedStyle.structuralPreset}
      data-title-mode={resolvedStyle.titleMode}
      data-card-radius={resolvedStyle.shell.radius}
      data-card-shadow={resolvedStyle.shell.shadow}
      data-card-spacing={resolvedStyle.shell.spacing}
      data-header-padding={resolvedStyle.header.padding}
      data-header-border-side={resolvedStyle.header.borderSide}
      data-info-padding={resolvedStyle.info.padding}
      data-info-gap={resolvedStyle.info.fieldGap}
      data-content-density={resolvedStyle.layoutPlan.contentDensity}
      data-layout-emphasis={resolvedStyle.layoutPlan.emphasis}
    >
      {sectionHeaderContent ? (
        <div className={styles.sectionHeaderContent}>{sectionHeaderContent}</div>
      ) : null}

      {description ? (
        <p
          className={styles.categoryDescription}
          data-testid="storefront-category-description"
        >
          {description}
        </p>
      ) : null}

      <div className={styles.grid}>
        {products.map((product, index) => (
          <ProductCard
            key={resolveCardKey(product, index)}
            product={product}
            cardStyle={resolvedStyle}
            sectionOrder={sectionOrder}
            infoSlots={infoSlots}
            hasImage={canShowImage && Boolean(product?.img_url)}
          />
        ))}
      </div>
    </section>
  );
}
