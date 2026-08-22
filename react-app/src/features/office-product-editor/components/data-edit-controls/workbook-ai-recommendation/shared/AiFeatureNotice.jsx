import { AI_FEATURE_NOTICES } from './aiFeatureNoticeConfig';
import styles from './AiFeatureNotice.module.css';

export function AiFeatureNotice({ featureId }) {
  const notice = AI_FEATURE_NOTICES[featureId];

  if (!notice) {
    return null;
  }

  return (
    <div className={styles.aiFeatureNotice}>
      <span className={styles.aiFeatureBadge}>{notice.label}</span>
      <p className={styles.aiFeatureText}>{notice.description}</p>
    </div>
  );
}
