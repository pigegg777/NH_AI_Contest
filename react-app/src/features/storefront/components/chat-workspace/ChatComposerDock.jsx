import CategoryTabs from './CategoryTabs';
import DesignTargetChipsBubble from './DesignTargetChipsBubble';
import styles from './ChatComposerDock.module.css';

export default function ChatComposerDock({ composer, categoryTabsMode }) {
  const copy = composer?.copy;

  if (!copy || !composer) {
    return null;
  }

  const starterPrompts = copy.starterPrompts ?? [];

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

      <div className={styles.step}>
        <p className={styles.stepHeading}>
          <span className={styles.stepNumber} aria-hidden="true">
            1
          </span>
          어디를 바꿀까요
        </p>

        <div className={styles.stepRow}>
          <CategoryTabs categoryTabsMode={categoryTabsMode} />

          <DesignTargetChipsBubble
            label={copy.targetLabel}
            options={composer.targetOptions}
            selectedTargetId={composer.selectedTargetId}
            onSelectTarget={composer.setTargetId}
          />
        </div>
      </div>

      <form className={`${styles.step} ${styles.form}`} onSubmit={handleSubmit}>
        <label
          className={styles.stepHeading}
          htmlFor="storefront-chat-composer-input"
        >
          <span className={styles.stepNumber} aria-hidden="true">
            2
          </span>
          무엇을 바꿀까요
        </label>

        {starterPrompts.length > 0 && !composer.promptDraft ? (
          <div
            className={styles.starterList}
            data-testid="storefront-chat-composer-starters"
          >
            {starterPrompts.map((starter) => (
              <button
                key={starter}
                type="button"
                className={styles.starterButton}
                onClick={() => composer.setPromptDraft(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}

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
