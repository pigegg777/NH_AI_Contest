import styles from './SaveControlPanel.module.css';

export function SaveControlPanel({
  handleSave,
  canSave,
  isSaving,
  saveDisabledMessage,
  saveErrorMessage,
  saveSuccessMessage,
}) {
  return (
    <>
      {handleSave ? (
        <button
          type="button"
          className={styles.saveButton}
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
      ) : null}
      {saveDisabledMessage ? (
        <div className={styles.statusMessage}>{saveDisabledMessage}</div>
      ) : null}
      {saveErrorMessage ? (
        <div className={styles.errorBox}>{saveErrorMessage}</div>
      ) : null}
      {saveSuccessMessage ? (
        <div className={styles.successBox}>{saveSuccessMessage}</div>
      ) : null}
    </>
  );
}
