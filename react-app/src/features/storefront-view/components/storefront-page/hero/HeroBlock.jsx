import { useFitTitleToOneLine } from '../../../hooks/useFitTitleToOneLine';
import { MIN_PAGE_TITLE_FONT_SIZE_PX } from '../../../model/card-grid-section/titleFitModel';
import styles from './HeroSection.module.css';

export default function HeroBlock({ view, brandLogoSrc }) {
  // 좁은 폰에서 제목이 두 줄로 접히면 글자를 줄여 한 줄로 맞춘다. 영업점
  // 이름이라 잘리면 안 되므로 카드 제목보다 깊게 줄인다.
  const titleRef = useFitTitleToOneLine(view.pageTitle, {
    minFontSizePx: MIN_PAGE_TITLE_FONT_SIZE_PX,
  });

  return (
    <div className={styles.heroTop}>
      {view.productUpdatedAtLabel ? (
        <p
          className={styles.updatedAt}
          data-testid="storefront-product-updated-at"
        >
          변경 기준일 : {view.productUpdatedAtLabel}
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
            <h1 ref={titleRef} className={styles.title} title={view.pageTitle}>
              {view.pageTitle}
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
