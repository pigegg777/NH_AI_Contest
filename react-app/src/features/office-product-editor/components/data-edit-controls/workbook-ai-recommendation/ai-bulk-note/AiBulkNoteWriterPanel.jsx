import { useState } from 'react';
import { AI_BULK_NOTE_PRICE_FIELD_KEYS } from '../../../../model/ai-bulk-note/aiBulkNoteMatchModel';
import { formatPriceValue } from '../../../../utils/reviewTableCellValueUtils';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiBulkNoteWriterPanel.module.css';

const PRICE_FIELD_LABELS = {
  zero_tax_price: '영세단가',
  tax_price: '과세단가',
  exempt_tax_price: '면세단가',
};

function findRowById(rows, rowId) {
  return (Array.isArray(rows) ? rows : []).find((row) => row.row_id === rowId) ?? null;
}

function AiBulkNoteFieldDiff({ label, oldValue, newValue }) {
  return (
    <p className={styles.matchNoteDiff}>
      <span className={styles.matchFieldLabel}>{label}: </span>
      {oldValue ? <span className={styles.matchOldNote}>{oldValue}</span> : null}
      {oldValue ? <span className={styles.matchArrow}> → </span> : null}
      <span className={styles.matchNewNote}>{newValue}</span>
    </p>
  );
}

function AiBulkNoteMatchList({ matches, rows }) {
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
            {match.note !== undefined ? (
              <AiBulkNoteFieldDiff label="비고" oldValue={row?.note} newValue={match.note} />
            ) : null}
            {AI_BULK_NOTE_PRICE_FIELD_KEYS.map((key) =>
              match[key] !== undefined ? (
                <AiBulkNoteFieldDiff
                  key={key}
                  label={PRICE_FIELD_LABELS[key]}
                  oldValue={formatPriceValue(row?.[key])}
                  newValue={formatPriceValue(match[key])}
                />
              ) : null,
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AiBulkNoteWriterPanel({ bulkNoteWriter }) {
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
    referenceSheet,
    referenceSheetError,
    handlePreview,
    handleApply,
    handleClear,
    handleUploadReferenceSheet,
    handleRemoveReferenceSheet,
  } = bulkNoteWriter;

  function handleSubmit() {
    const instruction = instructionDraft.trim();

    if (instruction === '') {
      return;
    }

    handlePreview(instruction);
  }

  function handleReferenceSheetInputChange(event) {
    const file = event.target.files?.[0] ?? null;
    handleUploadReferenceSheet(file);
    event.target.value = '';
  }

  return (
    <section className={`${primitives.panel} ${primitives.compactPanel} ${styles.panelBlock}`}>
      <div className={primitives.panelHeader}>
        <h4 id="bulk-note-writer-label" className={primitives.panelTitle}>
          📝 일괄 데이터 수정
        </h4>
      </div>
      <p className={styles.desc}>
        조건과 변경할 내용(비고, 영세단가, 과세단가, 면세단가 중 하나 이상)을 함께 말해주세요. 예:
        소분류가 가축분퇴비인 상품에는 &apos;보조 1500원&apos;이라는 비고 작성해줘
      </p>

      <div className={styles.referenceSheetRow}>
        {referenceSheet ? (
          <div className={styles.referenceSheetInfo}>
            <span className={styles.referenceSheetLabel}>
              📎 {referenceSheet.fileName} · {referenceSheet.sheetName} · {referenceSheet.rows.length}행
            </span>
            <button
              type="button"
              className={styles.referenceSheetRemoveButton}
              onClick={handleRemoveReferenceSheet}
            >
              제거
            </button>
          </div>
        ) : (
          <>
            <label
              className={styles.referenceSheetUploadButton}
              htmlFor="bulk-note-reference-sheet-input"
            >
              📎 참고 엑셀 업로드
            </label>
            <input
              id="bulk-note-reference-sheet-input"
              type="file"
              accept=".xlsx,.xls"
              className={styles.referenceSheetFileInput}
              onChange={handleReferenceSheetInputChange}
            />
          </>
        )}
      </div>
      {referenceSheetError ? (
        <p className={styles.referenceSheetErrorMessage}>{referenceSheetError}</p>
      ) : null}

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
            {matches.length}개 상품이 매칭되었습니다. 선택된 필드를 새 값으로 덮어씁니다.
          </p>
          <AiBulkNoteMatchList matches={matches} rows={rows} />
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
