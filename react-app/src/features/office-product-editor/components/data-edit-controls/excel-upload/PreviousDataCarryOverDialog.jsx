import { useEffect } from 'react';

import { CARRY_OVER_MODES } from '../../../hooks/office-product-data/usePreviousDataCarryOver';
import styles from './ExcelUploadSection.module.css';

function buildCarriedSummary(carriedImageCount, carriedNoteCount) {
  const parts = [];

  if (carriedImageCount > 0) {
    parts.push(`사진 ${carriedImageCount}건`);
  }

  if (carriedNoteCount > 0) {
    parts.push(`비고 ${carriedNoteCount}건`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Asked once, right after a workbook is parsed over a category that already has
 * saved rows. Dismissing keeps the carry-over: it is the non-destructive answer,
 * and the carried values are visible in the review table either way.
 */
export function PreviousDataCarryOverDialog({
  isOpen,
  categoryName,
  carriedImageCount,
  carriedNoteCount,
  onChoose,
  onDismiss,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onDismiss();
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown);

    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) {
    return null;
  }

  const carriedSummary = buildCarriedSummary(carriedImageCount, carriedNoteCount);

  return (
    <div
      className={styles.carryOverOverlay}
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className={styles.carryOverDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="carry-over-dialog-title"
        data-testid="excel-upload-carry-over-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className={styles.carryOverDialogTitle} id="carry-over-dialog-title">
          기존 사진·비고를 이어받을까요?
        </h2>

        <p className={styles.carryOverDialogBody}>
          {categoryName ? `${categoryName}에` : '이 분류에'} 이미 저장된 데이터가
          있습니다.
          {carriedSummary
            ? ` 상품코드가 같은 상품의 ${carriedSummary}을 새 데이터로 옮깁니다.`
            : ' 다만 새 엑셀이 이미 값을 채우고 있어 옮길 사진이나 비고가 없습니다.'}
        </p>

        <p className={styles.carryOverDialogNote}>
          단가(과세·영세·면세)는 어느 쪽을 고르든 항상 새 엑셀 값으로 저장됩니다.
        </p>

        <div className={styles.carryOverDialogActions}>
          <button
            type="button"
            className={styles.carryOverSecondaryButton}
            onClick={() => onChoose(CARRY_OVER_MODES.reset)}
          >
            그냥 신규로
          </button>
          <button
            type="button"
            className={styles.carryOverPrimaryButton}
            onClick={() => onChoose(CARRY_OVER_MODES.carry)}
          >
            이어받기
          </button>
        </div>
      </div>
    </div>
  );
}
