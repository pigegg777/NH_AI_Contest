import styles from '../StorefrontView.module.css';

export default function MobileCategoryBarBlock({ view, elementKey }) {
  if (!view.activeSectionTitle) {
    return null;
  }

  return (
    <div
      className={styles.mobileCategoryBar}
      data-testid="storefront-mobile-category-bar"
    >
      <strong className={styles.mobileCategoryTitle}>
        {view.activeSectionTitle}
      </strong>
      {view.activeSectionMediumCategories.length > 0 ? (
        <div className={styles.mobileCategoryMeta}>
          {view.activeSectionMediumCategories.map((item) => (
            <span
              key={`${elementKey}-${item}`}
              className={styles.mobileCategoryMetaItem}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
