import styles from './HeroSection.module.css';

export default function HeroBlock({ view, brandLogoSrc }) {
  return (
    <div className={styles.heroTop}>
      {view.productUpdatedAtLabel ? (
        <p
          className={styles.updatedAt}
          data-testid="storefront-product-updated-at"
        >
          단가 기준일 : {view.productUpdatedAtLabel}
        </p>
      ) : null}

      <div className={styles.brandBlock}>
        <div className={styles.brandIdentity}>
          <div className={styles.logoShell} aria-hidden="true">
            <img
              className={styles.logo}
              src={brandLogoSrc}
              alt=""
              data-testid="storefront-brand-logo"
            />
          </div>
          <div className={styles.brandCopy}>
            <h1 className={styles.title}>{view.pageTitle}</h1>
          </div>
        </div>
      </div>

      {/* Outside the logo row on purpose: inside it, the description's width
          fed back into the centred logo+title block, so typing copy nudged the
          logo sideways and wrapped the text into a narrow column. */}
      {view.pageDescription ? (
        <p
          className={styles.description}
          data-testid="storefront-page-description"
        >
          {view.pageDescription}
        </p>
      ) : null}
    </div>
  );
}
