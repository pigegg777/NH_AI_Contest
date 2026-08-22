import { useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './UsageCell.module.css';

export function UsageCell({ usage, productName, rowId }) {
  const [isOpen, setIsOpen] = useState(false);
  const entries = Array.isArray(usage) ? usage : [];

  if (entries.length === 0) {
    return <span>-</span>;
  }

  return (
    <>
      <button
        type="button"
        aria-label={`usage-cell-${rowId}`}
        className={styles.tableLinkButton}
        onClick={() => setIsOpen(true)}
      >
        보기 ({entries.length})
      </button>

      {isOpen
        ? createPortal(
            <div
              className={styles.usageOverlay}
              role="presentation"
              onClick={() => setIsOpen(false)}
            >
              <div
                className={styles.usagePopover}
                role="dialog"
                aria-label={`usage-popover-${rowId}`}
                onClick={(event) => event.stopPropagation()}
              >
                <div className={styles.usagePopoverHeader}>
                  <strong>{productName || '사용법'}</strong>
                  <button
                    type="button"
                    aria-label={`usage-close-${rowId}`}
                    className={styles.usageCloseButton}
                    onClick={() => setIsOpen(false)}
                  >
                    닫기
                  </button>
                </div>

                <div className={styles.usageTableWrap}>
                  <table className={styles.usageTable}>
                    <thead>
                      <tr>
                        <th>작물</th>
                        <th>적용 병해충</th>
                        <th>사용방법</th>
                        <th>희석배수</th>
                        <th>사용시기</th>
                        <th>사용횟수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry, index) => (
                        <tr key={index}>
                          <td>{entry?.cropName || '-'}</td>
                          <td>{entry?.diseaseWeedName || '-'}</td>
                          <td>{entry?.pestiUse || '-'}</td>
                          <td>{entry?.dilutUnit || '-'}</td>
                          <td>{entry?.useSuittime || '-'}</td>
                          <td>{entry?.useNum || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
