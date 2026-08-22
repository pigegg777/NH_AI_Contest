import { useInlineEditableValue } from '../../../hooks/review-table/useInlineEditableValue';
import styles from './NoteCell.module.css';

export function NoteCell({ row, onNoteChange }) {
  const { isEditing, draftValue, setDraftValue, open, commit, handleKeyDown } = useInlineEditableValue(
    row.note,
    { onCommit: (draft) => onNoteChange(row.row_id, draft) },
  );

  if (isEditing) {
    return (
      <input
        aria-label={`note-input-${row.row_id}`}
        autoFocus
        className={styles.noteInput}
        type="text"
        value={draftValue}
        onBlur={commit}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button type="button" aria-label={`note-cell-${row.row_id}`} className={styles.noteButton} onClick={open}>
      {row.note || '-'}
    </button>
  );
}
