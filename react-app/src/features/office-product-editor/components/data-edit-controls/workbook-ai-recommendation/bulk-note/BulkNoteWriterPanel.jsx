import { useState } from 'react';
import primitives from './panelPrimitives.module.css';
import styles from './BulkNoteWriterPanel.module.css';

function findRowById(rows, rowId) {
  return (Array.isArray(rows) ? rows : []).find((row) => row.row_id === rowId) ?? null;
}

function BulkNoteMatchList({ matches, rows }) {
  return (
    <ul className={styles.matchList}>
      {matches.map((match) => {
        const row = findRowById(rows, match.rowId);

        return (
          <li key={match.rowId} className={styles.matchItem}>
            <div className={styles.matchHeader}>
              <strong>{row?.product_name || match.rowId}</strong>
              {row?.spec ? <span className={styles.matchSpec}>{row.spec}</span> : null}
            </div>
            <p className={styles.matchNoteDiff}>
              {row?.note ? <span className={styles.matchOldNote}>{row.note}</span> : null}
              {row?.note ? <span className={styles.matchArrow}> → </span> : null}
              <span className={styles.matchNewNote}>{match.note}</span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function BulkNoteWriterPanel({ bulkNoteWriter }) {
  const [instructionDraft, setInstructionDraft] = useState('');

  if (!bulkNoteWriter) {
    return null;
  }

  const {
    rows,
    isLoading,
    mode,
    matches,
    unmatchedReason,
    message,
    appliedCount,
    handlePreview,
    handleApply,
    handleClear,
  } = bulkNoteWriter;

  function handleSubmit() {
    const instruction = instructionDraft.trim();

    if (instruction === '') {
      return;
    }

    handlePreview(instruction);
  }

  return (
    <section className={`${primitives.panel} ${primitives.compactPanel} ${styles.panelBlock}`}>
      <div className={primitives.panelHeader}>
        <h4 id="bulk-note-writer-label" className={primitives.panelTitle}>
          📝 일괄비고작성
        </h4>
      </div>
      <p className={styles.desc}>
        조건과 작성할 비고 내용을 함께 말해주세요. 예: 소분류가 가축분퇴비인 상품에는 &apos;보조
        1500원&apos;이라는 비고 작성해줘
      </p>
      <div className={primitives.promptRow}>
        <textarea
          id="bulk-note-writer-instruction"
          aria-labelledby="bulk-note-writer-label"
          className={primitives.promptInput}
          value={instructionDraft}
          onChange={(event) => setInstructionDraft(event.target.value)}
          placeholder="예: 소분류가 가축분퇴비인 상품에는 '보조 1500원' 비고 작성해줘"
          rows={1}
        />
        <button
          type="button"
          className={styles.previewButton}
          disabled={instructionDraft.trim() === '' || isLoading}
          onClick={handleSubmit}
        >
          매칭 미리보기
        </button>
      </div>

      {isLoading ? <p className={styles.status}>매칭 중...</p> : null}
      {!isLoading && mode === 'error' ? (
        <p className={styles.status}>{message || '일괄비고 작성에 실패했습니다.'}</p>
      ) : null}
      {!isLoading && mode === 'openai' && matches.length === 0 ? (
        <p className={styles.status}>{unmatchedReason || '조건에 맞는 상품을 찾지 못했습니다.'}</p>
      ) : null}
      {!isLoading && matches.length > 0 ? (
        <div className={styles.previewBlock}>
          <p className={styles.matchCount}>
            {matches.length}개 상품이 매칭되었습니다. 기존 비고를 새 내용으로 덮어씁니다.
          </p>
          <BulkNoteMatchList matches={matches} rows={rows} />
          <div className={styles.previewActions}>
            <button type="button" className={styles.applyButton} onClick={handleApply}>
              적용
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleClear}>
              취소
            </button>
          </div>
        </div>
      ) : null}
      {!isLoading && appliedCount > 0 ? (
        <p className={styles.status}>{appliedCount}개 행에 비고를 적용했습니다.</p>
      ) : null}
    </section>
  );
}
