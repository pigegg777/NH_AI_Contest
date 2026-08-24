import styles from './CardGridSection.module.css';

export default function CardImageSection({ product, imageSrc, cardStyle, fitOverride }) {
  return (
    <div className={styles.cardImageWrap}>
      <img
        className={styles.cardImage}
        src={imageSrc}
        alt={product?.product_name || ''}
        style={{ objectFit: fitOverride || cardStyle.image.fit }}
      />
    </div>
  );
}
