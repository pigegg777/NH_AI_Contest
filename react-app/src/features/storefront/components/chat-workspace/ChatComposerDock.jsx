import CategoryTabs from './CategoryTabs';
import DesignTargetChipsBubble from './DesignTargetChipsBubble';
import styles from './ChatComposerDock.module.css';

export default function ChatComposerDock({ composer, categoryTabsMode }) {
  const copy = composer?.copy;

  if (!copy || !composer) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    composer.sendPrompt();
  }

  return (
    <section
      className={styles.dock}
      data-testid="storefront-chat-composer-dock"
    >
      <div className={styles.header}>
        <div className={styles.headerText}>
          <p className={styles.title}>{copy.title}</p>
          <p className={styles.description}>{copy.description}</p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.discardButton}
            onClick={composer.exitMode}
          >
            {copy.discardLabel}
          </button>
          {composer.showApplyAction ? (
            <button
              type="button"
              className={styles.applyButton}
              disabled={composer.isApplying || !composer.canApply}
              onClick={composer.applyDraft}
            >
              저장하기
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.categoryTabsWrap}>
        <CategoryTabs categoryTabsMode={categoryTabsMode} />
      </div>

      <div className={styles.targetBubbleWrap}>
        <DesignTargetChipsBubble
          label={copy.targetLabel}
          options={composer.targetOptions}
          selectedTargetId={composer.selectedTargetId}
          onSelectTarget={composer.setTargetId}
        />
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <label
          className={styles.inputLabel}
          htmlFor="storefront-chat-composer-input"
        >
          요청 내용
        </label>
        <textarea
          id="storefront-chat-composer-input"
          data-testid="storefront-chat-composer-input"
          className={styles.input}
          value={composer.promptDraft}
          placeholder={copy.placeholder}
          onChange={(event) => composer.setPromptDraft(event.target.value)}
          rows={5}
        />

        {composer.errorMessage ? (
          <p className={styles.errorMessage}>{composer.errorMessage}</p>
        ) : null}

        <div className={styles.footer}>
          <button
            type="submit"
            className={styles.sendButton}
            data-testid="storefront-chat-composer-send"
            disabled={composer.isApplying || !composer.canSend}
          >
            {composer.isApplying ? '전송 중…' : copy.sendLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
