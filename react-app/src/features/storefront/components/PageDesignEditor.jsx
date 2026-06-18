import { STOREFRONT_DESIGN_DIRECTIONS } from '../model/storefrontBuilderModel';
import styles from './PageDesignEditor.module.css';

export default function PageDesignEditor({
  designDirection,
  onSelectDesignDirection,
  representativeCategoryLabel,
}) {
  return (
    <div className={styles.editor} data-testid="page-design-editor">
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.eyebrow}>페이지 디자인 설정</p>
            <h3 className={styles.title}>모바일 스토어프론트 분위기 설정</h3>
          </div>
          <p className={styles.helper}>
            해당 디자인을 바탕으로 페이지의 전반적인 분위기를 생성할 수 있습니다!
          </p>
          {representativeCategoryLabel ? (
            <p className={styles.selectionNote}>
              현재 기준 카테고리: <strong>{representativeCategoryLabel}</strong>
            </p>
          ) : null}
        </div>

        <div className={styles.directionGrid}>
          {STOREFRONT_DESIGN_DIRECTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={designDirection === option.id ? styles.directionActive : styles.directionButton}
              aria-pressed={designDirection === option.id}
              onClick={() => onSelectDesignDirection(option.id)}
            >
              <span className={styles.directionLabel}>{option.label}</span>
              <span className={styles.directionDescription}>{option.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
