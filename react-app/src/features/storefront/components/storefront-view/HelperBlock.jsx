import styles from '../StorefrontView.module.css';

export default function HelperBlock({ block }) {
  if (!block) {
    return null;
  }

  if (block.type === 'noticeBanner') {
    return (
      <div className={styles.noticeBanner} data-testid={`storefront-block-${block.type}`}>
        {block.props.title ? <strong className={styles.helperTitle}>{block.props.title}</strong> : null}
        {block.props.text ? <p className={styles.helperText}>{block.props.text}</p> : null}
      </div>
    );
  }

  if (block.type === 'highlightBox') {
    return (
      <div className={styles.highlightBox} data-testid={`storefront-block-${block.type}`}>
        {block.props.title ? <strong className={styles.helperTitle}>{block.props.title}</strong> : null}
        {block.props.text ? <p className={styles.helperText}>{block.props.text}</p> : null}
      </div>
    );
  }

  if (block.type === 'ctaButton') {
    return (
      <button type="button" className={styles.ctaButton} data-testid={`storefront-block-${block.type}`}>
        {block.props.label || '자세히 보기'}
      </button>
    );
  }

  if (block.type === 'divider') {
    return (
      <div className={styles.divider} data-testid={`storefront-block-${block.type}`}>
        {block.props.label ? <span className={styles.dividerLabel}>{block.props.label}</span> : null}
      </div>
    );
  }

  return null;
}
