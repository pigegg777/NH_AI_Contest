import { isHeaderAboveSplit } from '../../../model/card-style/cardCompositionModel';
import {
  buildConditionalArticleStyle,
  buildConditionalInfoBodyStyle,
  resolveActiveConditionalStyle,
} from '../../../model/card-grid-section/cardGridConditionalStyleModel';
import CardHeaderSection from './CardHeaderSection';
import CardImageSection from './CardImageSection';
import CardInfoSection from './CardInfoSection';
import styles from './CardGridSection.module.css';

/**
 * One product article. The three layout branches below differ only in how the
 * image is placed relative to the rest, so they all reuse the same section nodes.
 */
export default function ProductCard({
  product,
  cardStyle,
  sectionOrder,
  infoSlots,
  hasImage,
}) {
  const { imagePlacement } = cardStyle.layoutPlan;
  const isSideImage = hasImage && (imagePlacement === 'left' || imagePlacement === 'right');
  const activeConditionalStyle = resolveActiveConditionalStyle(
    product,
    cardStyle.conditionalStyles,
  );
  const articleStyle = buildConditionalArticleStyle(activeConditionalStyle);
  const infoBodyStyle = buildConditionalInfoBodyStyle(activeConditionalStyle);

  const sectionNodes = {
    header: sectionOrder.includes('header') ? (
      <CardHeaderSection key="header" product={product} cardStyle={cardStyle} />
    ) : null,
    image: hasImage ? (
      <CardImageSection
        key="image"
        product={product}
        imageSrc={product?.img_url}
        cardStyle={cardStyle}
        fitOverride={activeConditionalStyle?.image?.fit}
      />
    ) : null,
    info: (
      <CardInfoSection
        key="info"
        product={product}
        cardStyle={cardStyle}
        infoSlots={infoSlots}
        titleMode={cardStyle.titleMode}
        bodyStyleOverride={infoBodyStyle}
      />
    ),
  };

  const imageBefore = imagePlacement === 'left' ? sectionNodes.image : null;
  const imageAfter = imagePlacement === 'right' ? sectionNodes.image : null;

  // Title spans the full width, with the image and the rest split left/right below it.
  if (isSideImage && isHeaderAboveSplit(sectionOrder)) {
    const splitSectionOrder = sectionOrder.filter(
      (sectionName) => sectionName !== 'image' && sectionName !== 'header',
    );

    return (
      <article
        className={`${styles.card} ${styles.cardHeaderSplit}`}
        style={articleStyle}
        data-image-placement={imagePlacement}
      >
        {sectionNodes.header}
        <div
          className={`${styles.cardSplitRow} ${
            imagePlacement === 'right' ? styles.cardImageRight : styles.cardImageLeft
          }`}
        >
          {imageBefore}
          <div className={styles.cardMain}>
            {splitSectionOrder.map((sectionName) => sectionNodes[sectionName])}
          </div>
          {imageAfter}
        </div>
      </article>
    );
  }

  // Image beside everything else, title included.
  if (isSideImage) {
    const mainSectionOrder = sectionOrder.filter((sectionName) => sectionName !== 'image');

    return (
      <article
        className={`${styles.card} ${styles.cardSideBySide} ${
          imagePlacement === 'right' ? styles.cardImageRight : styles.cardImageLeft
        }`}
        style={articleStyle}
        data-image-placement={imagePlacement}
      >
        {imageBefore}
        <div className={styles.cardMain}>
          {mainSectionOrder.map((sectionName) => sectionNodes[sectionName])}
        </div>
        {imageAfter}
      </article>
    );
  }

  // Everything stacked in the order the layout plan asks for.
  return (
    <article
      className={styles.card}
      style={articleStyle}
      data-image-placement={imagePlacement}
    >
      {sectionOrder.map((sectionName) => sectionNodes[sectionName])}
    </article>
  );
}
