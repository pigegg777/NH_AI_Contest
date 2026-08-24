import styles from './HeroSection.module.css';

export default function HeroBlock({ view, brandLogoSrc }) {
  return (
    <div className={styles.heroTop}>
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
            {view.coopName ? (
              <p className={styles.eyebrow}>{view.coopName}</p>
            ) : null}
            <h1 className={styles.title}>{view.headerOrgLine}</h1>
            {view.subtitle ? (
              <p className={styles.subtitle}>{view.subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
