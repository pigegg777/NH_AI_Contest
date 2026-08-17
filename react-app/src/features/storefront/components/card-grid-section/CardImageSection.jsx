import styles from '../CardGridSection.module.css';

export default function CardImageSection({ product, imageSrc, isAiGenerated, cardStyle, fitOverride }) {
  return (
    <div className={styles.cardImageWrap}>
      <img
        className={styles.cardImage}
        src={imageSrc}
        alt={product?.product_name || ''}
        style={{ objectFit: fitOverride || cardStyle.image.fit }}
      />
      {isAiGenerated ? <span className={styles.aiGeneratedBadge}>AI 생성 이미지</span> : null}
    </div>
  );
}
