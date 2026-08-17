import { normalizeCardStyle } from '../model/card-design/style/cardStyleModel';
import { resolveSectionOrderFromLayoutPlan } from '../model/card-design/style/cardCompositionModel';
import { buildResolvedInfoSlots } from '../model/card-grid-section/cardGridSlotModel';
import { buildShellCssVars } from '../model/card-grid-section/cardGridFieldStyleModel';
import {
  buildConditionalArticleStyle,
  buildConditionalInfoBodyStyle,
  resolveActiveConditionalStyle,
} from '../model/card-grid-section/cardGridConditionalStyleModel';
import CardHeaderSection from './card-grid-section/CardHeaderSection';
import CardImageSection from './card-grid-section/CardImageSection';
import CardInfoSection from './card-grid-section/CardInfoSection';
import styles from './CardGridSection.module.css';

export default function CardGridSection({
  section,
  fields,
  cardStyle,
  bodySlots = [],
  sectionId,
  sectionHeaderContent = null,
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
      data-info-padding={resolvedStyle.info.padding}
      data-info-gap={resolvedStyle.info.fieldGap}
      data-content-density={resolvedStyle.layoutPlan.contentDensity}
      data-layout-emphasis={resolvedStyle.layoutPlan.emphasis}
    >
      {sectionHeaderContent ? (
        <div className={styles.sectionHeaderContent}>
          {sectionHeaderContent}
        </div>
      ) : null}
      <div className={styles.grid}>
        {products.map((product, index) => {
          const cardKey =
            product?.row_id ||
            product?.product_code ||
            `${product?.product_name ?? 'product'}-${product?.spec ?? index}`;
          const generatedImageForProduct =
            section?.generatedCategoryImages?.[product?.medium_category] ?? null;
          const resolvedImageSrc = product?.img_url || generatedImageForProduct?.imageDataUri || '';
          const isAiGeneratedImage = !product?.img_url && Boolean(generatedImageForProduct);
          const hasImage =
            (visibleFields.includes('img_url') || isAiGeneratedImage) &&
            Boolean(resolvedImageSrc) &&
            sectionOrder.includes('image');
          const isSideImage =
            hasImage &&
            (resolvedStyle.layoutPlan.imagePlacement === 'left' ||
              resolvedStyle.layoutPlan.imagePlacement === 'right');
          const activeConditionalStyle = resolveActiveConditionalStyle(
            product,
            resolvedStyle.conditionalStyles,
          );
          const articleStyle = buildConditionalArticleStyle(activeConditionalStyle);
          const infoBodyStyle = buildConditionalInfoBodyStyle(activeConditionalStyle);
          const sectionNodes = {
            header: sectionOrder.includes('header') ? (
              <CardHeaderSection
                key="header"
                product={product}
                cardStyle={resolvedStyle}
              />
            ) : null,
            image: hasImage ? (
              <CardImageSection
                key="image"
                product={product}
                imageSrc={resolvedImageSrc}
                isAiGenerated={isAiGeneratedImage}
                cardStyle={resolvedStyle}
                fitOverride={activeConditionalStyle?.image?.fit}
              />
            ) : null,
            info: (
              <CardInfoSection
                key="info"
                product={product}
                cardStyle={resolvedStyle}
                infoSlots={infoSlots}
                titleMode={resolvedStyle.titleMode}
                bodyStyleOverride={infoBodyStyle}
              />
            ),
          };

          if (isSideImage) {
            const mainSectionOrder = sectionOrder.filter(
              (sectionName) => sectionName !== 'image',
            );

            return (
              <article
                key={cardKey}
                className={`${styles.card} ${styles.cardSideBySide} ${
                  resolvedStyle.layoutPlan.imagePlacement === 'right'
                    ? styles.cardImageRight
                    : styles.cardImageLeft
                }`}
                style={articleStyle}
                data-image-placement={resolvedStyle.layoutPlan.imagePlacement}
              >
                {resolvedStyle.layoutPlan.imagePlacement === 'left'
                  ? sectionNodes.image
                  : null}
                <div className={styles.cardMain}>
                  {mainSectionOrder.map(
                    (sectionName) => sectionNodes[sectionName],
                  )}
                </div>
                {resolvedStyle.layoutPlan.imagePlacement === 'right'
                  ? sectionNodes.image
                  : null}
              </article>
            );
          }

          return (
            <article
              key={cardKey}
              className={styles.card}
              style={articleStyle}
              data-image-placement={resolvedStyle.layoutPlan.imagePlacement}
            >
              {sectionOrder.map((sectionName) => sectionNodes[sectionName])}
            </article>
          );
        })}
      </div>
    </section>
  );
}
