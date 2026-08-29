import { useAiBulkNoteInstructionForm } from '../../../../hooks/ai-bulk-note/useAiBulkNoteInstructionForm';
import { AiBulkNoteMatchList } from './AiBulkNoteMatchList';
import { AiBulkNoteRowPlanList } from './AiBulkNoteRowPlanList';
import controls from '../../shared/controlPrimitives.module.css';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiBulkNoteWriterPanel.module.css';

export function AiBulkNoteWriterPanel({ bulkNoteWriter }) {
  const {
    rows,
    isLoading,
    mode,
    matches,
    unmatchedReason,
    message,
    appliedCount,
    action,
    rowPlan,
    rowPlanCount = 0,
    ambiguousSelection = new Set(),
    selectedAmbiguousCount = 0,
    appliedSummary,
    referenceSheet,
    referenceSheetError,
    handlePreview,
    handleApply,
    handleApplyRowPlan,
    handleToggleAmbiguousTarget,
    handleClear,
    handleUploadReferenceSheet,
    handleRemoveReferenceSheet,
  } = bulkNoteWriter ?? {};

  const {
    instructionDraft,
    setInstructionDraft,
    handleSubmit,
    handleReferenceSheetInputChange,
  } = useAiBulkNoteInstructionForm({
    handlePreview,
    handleUploadReferenceSheet,
  });

  if (!bulkNoteWriter) {
    return null;
  }

  return (
    <section
      className={`${primitives.panel} ${primitives.compactPanel} ${styles.panelBlock}`}
    >
      {/* 엑셀 업로드 패널과 같은 배치: 제목 왼쪽, 파일 선택 버튼 오른쪽. */}
      <div className={primitives.panelHeader}>
        <h4 id="bulk-note-writer-label" className={primitives.panelTitle}>
          📝 일괄 데이터 수정
        </h4>
        {referenceSheet ? (
          <div className={styles.referenceSheetInfo}>
            <span className={styles.referenceSheetLabel}>
              📎 {referenceSheet.fileName} · {referenceSheet.sheetName} ·{' '}
              {referenceSheet.rows.length}행
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
              className={controls.actionButton}
              htmlFor="bulk-note-reference-sheet-input"
            >
              📂 파일 선택
            </label>
            <input
              id="bulk-note-reference-sheet-input"
              type="file"
              accept=".xlsx,.xls"
              className={controls.fileInput}
              onChange={handleReferenceSheetInputChange}
            />
          </>
        )}
      </div>
      {referenceSheetError ? (
        <p className={styles.referenceSheetErrorMessage}>
          {referenceSheetError}
        </p>
      ) : null}

      <div className={primitives.promptRow}>
        <textarea
          id="bulk-note-writer-instruction"
          aria-labelledby="bulk-note-writer-label"
          className={primitives.promptInput}
          value={instructionDraft}
          onChange={(event) => setInstructionDraft(event.target.value)}
          placeholder="예: 소분류가 가축분퇴비인 상품에 '보조 1500원' 비고 작성해줘 / 업로드한 엑셀 데이터 추가해줘(조합원 정상가를 가격으로 판단해줘)"
          rows={2}
        />
        <button
          type="button"
          className={controls.actionButton}
          disabled={instructionDraft.trim() === '' || isLoading}
          onClick={handleSubmit}
        >
          AI 실행
        </button>
      </div>

      {isLoading ? <p className={styles.status}>매칭 중...</p> : null}
      {!isLoading && mode === 'error' ? (
        <p className={styles.status}>
          {message || '일괄비고 작성에 실패했습니다.'}
        </p>
      ) : null}
      {!isLoading &&
      mode === 'openai' &&
      matches.length === 0 &&
      rowPlanCount === 0 ? (
        <p className={styles.status}>
          {unmatchedReason || '조건에 맞는 상품을 찾지 못했습니다.'}
        </p>
      ) : null}
      {!isLoading && action === 'append_rows' && rowPlanCount > 0 ? (
        <div className={styles.previewBlock}>
          <p className={styles.matchCount}>
            상품 {rowPlanCount}건을 읽었습니다. 등록 내용을 확인해 주세요.
          </p>
          <AiBulkNoteRowPlanList
            rowPlan={rowPlan}
            ambiguousSelection={ambiguousSelection}
            onToggleTarget={handleToggleAmbiguousTarget}
          />
          <div className={styles.previewActions}>
            {rowPlan.appended.length > 0 ? (
              <button
                type="button"
                className={styles.applyButton}
                onClick={() => handleApplyRowPlan({ includeConflicts: false })}
              >
                신규 {rowPlan.appended.length}건만 추가
              </button>
            ) : null}
            {rowPlan.conflicting.length + selectedAmbiguousCount > 0 ? (
              <button
                type="button"
                className={styles.applyButton}
                onClick={() => handleApplyRowPlan({ includeConflicts: true })}
              >
                {rowPlan.appended.length > 0
                  ? `신규 ${rowPlan.appended.length}건 추가 + ${rowPlan.conflicting.length + selectedAmbiguousCount}건 갱신`
                  : `${rowPlan.conflicting.length + selectedAmbiguousCount}건 갱신`}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClear}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
      {!isLoading && matches.length > 0 ? (
        <div className={styles.previewBlock}>
          <p className={styles.matchCount}>
            {matches.length}개 상품이 매칭되었습니다. 선택된 필드를 새 값으로
            덮어씁니다.
          </p>
          <AiBulkNoteMatchList matches={matches} rows={rows} />
          <div className={styles.previewActions}>
            <button
              type="button"
              className={styles.applyButton}
              onClick={handleApply}
            >
              적용
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClear}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
      {!isLoading && appliedCount > 0 ? (
        <p className={styles.status}>
          {appliedCount}개 행에 비고를 적용했습니다.
        </p>
      ) : null}
      {!isLoading && appliedSummary ? (
        <p className={styles.status}>{appliedSummary}</p>
      ) : null}
    </section>
  );
}
