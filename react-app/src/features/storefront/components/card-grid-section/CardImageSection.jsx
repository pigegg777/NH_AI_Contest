import styles from '../CardGridSection.module.css';

export default function CardImageSection({ product, cardStyle, fitOverride }) {
  return (
    <div className={styles.cardImageWrap}>
      <img
        className={styles.cardImage}
        src={product.img_url}
        alt={product?.product_name || ''}
        style={{ objectFit: fitOverride || cardStyle.image.fit }}
      />
    </div>
  );
}
