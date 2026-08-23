import FieldSelectionDock from './FieldSelectionDock';
import ChatComposerDock from './ChatComposerDock';
import ModeChoiceBubble from './ModeChoiceBubble';
import StorefrontChatThread from './StorefrontChatThread';
import styles from './StorefrontChatWorkspace.module.css';

function AiEditIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M8 2.4 9.45 6.55 13.6 8 9.45 9.45 8 13.6 6.55 9.45 2.4 8 6.55 6.55z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M14.6 11.6 15.4 13.8 17.6 14.6 15.4 15.4 14.6 17.6 13.8 15.4 11.6 14.6 13.8 13.8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StorefrontChatWorkspace({ session, builder }) {
  const dataMode = builder?.dataMode;
  const designMode = builder?.designMode;
  const composerMode = builder?.composerMode;
  const isDataMode = session.mode === 'data' && dataMode;
  const isDesignMode = session.mode === 'design' && designMode;
  const modeChoiceMessage = session.messages.find(
    (message) => message.kind === 'mode-choice',
  );
  const isIdle = session.mode === 'idle';
  const modeChoiceBubble = modeChoiceMessage ? (
    <ModeChoiceBubble
      activeModeId={session.mode}
      message={modeChoiceMessage}
      onChooseMode={session.chooseMode}
      size={isIdle ? 'expanded' : 'compact'}
    />
  ) : null;
  const pageDescription = (
    <p className={styles.pageDescription}>
      말로 요청하면 미리보기에 바로 반영됩니다
    </p>
  );

  async function handleApplyDataMode() {
    if (!dataMode) {
      return;
    }

    await dataMode.applyChanges?.();
  }

  return (
    <section
      className={styles.workspace}
      data-testid="storefront-chat-workspace"
    >
      <div className={styles.workspaceHeader}>
        <div className={isIdle ? styles.titleRow : styles.titleRowSplit}>
          <h2 className={styles.title}>
            <span className={styles.titleIcon}>
              <AiEditIcon />
            </span>
            AI 편집
          </h2>
          {isIdle ? pageDescription : modeChoiceBubble}
        </div>

        {isIdle ? null : pageDescription}
      </div>

      <StorefrontChatThread
        canUndo={Boolean(session.lastApplySnapshot)}
        intro={
          isIdle && modeChoiceBubble ? (
            <div className={styles.threadIntro}>
              <p className={styles.threadIntroPrompt}>{modeChoiceMessage.text}</p>
              {modeChoiceBubble}
            </div>
          ) : null
        }
        onUndo={builder.undoLastApply}
        session={session}
      />

      {isDataMode ? (
        <FieldSelectionDock dataMode={dataMode} onApply={handleApplyDataMode} />
      ) : composerMode ? (
        <div className={styles.composerShell}>
          <ChatComposerDock
            composer={composerMode}
            categoryTabsMode={isDesignMode ? designMode : null}
          />
        </div>
      ) : (
        <div className={styles.scaffoldPanel} />
      )}
    </section>
  );
}
