import { useEditorMeta, useSaveCtx } from '../../contexts/editorContexts';
import { SaveControlPanel } from './SaveControlPanel';
import styles from './HeaderSection.module.css';

export function HeaderSection({ onOpenNongyak }) {
  const {
    activeCategoryName,
    bannerStatusLabel,
    bannerStatusVariant,
    tableNameMode,
  } = useEditorMeta();
  const save = useSaveCtx();
  const canOpenNongyak =
    tableNameMode === 'pesticide' && typeof onOpenNongyak === 'function';

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {activeCategoryName ||
              '새 테이블을 등록하거나 왼쪽에서 데이터를 선택해 주세요'}
          </h1>

          {activeCategoryName && (
            <span
              className={[
                styles.status,
                bannerStatusVariant === 'registered'
                  ? styles.statusRegistered
                  : styles.statusNew,
              ].join(' ')}
            >
              {bannerStatusLabel}
            </span>
          )}
          {canOpenNongyak ? (
            <button
              type="button"
              className={styles.nongyakShortcut}
              onClick={onOpenNongyak}
            >
              농약 정보 검색 바로가기
            </button>
          ) : null}
        </div>
      </div>
      {save?.handleSave && (
        <div className={styles.actions}>
          <SaveControlPanel {...save} />
        </div>
      )}
    </div>
  );
}
