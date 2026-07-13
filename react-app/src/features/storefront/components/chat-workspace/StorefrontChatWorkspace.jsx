import FieldSelectionDock from './FieldSelectionDock';
import ChatComposerDock from './ChatComposerDock';
import ModeChoiceBubble from './ModeChoiceBubble';
import StorefrontChatThread from './StorefrontChatThread';
import { getStorefrontChatScaffoldCopy } from './storefrontChatModes';
import styles from './StorefrontChatWorkspace.module.css';

export default function StorefrontChatWorkspace({ session, builder }) {
  const dataMode = builder?.dataMode;
  const cardMode = builder?.cardMode;
  const composerMode = builder?.composerMode;
  const isDataMode = session.mode === 'data' && dataMode;
  const showCategoryTabs =
    (session.mode === 'card' || session.mode === 'autoDesign') && cardMode;
  const modeChoiceMessage = session.messages.find(
    (message) => message.kind === 'mode-choice',
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
      <h2 className={styles.title}>스토어프론트 AI 작업 공간</h2>

      {modeChoiceMessage ? (
        <ModeChoiceBubble
          message={modeChoiceMessage}
          onChooseMode={session.chooseMode}
        />
      ) : null}

      <StorefrontChatThread
        canUndo={Boolean(session.lastApplySnapshot)}
        onUndo={builder.undoLastApply}
        session={session}
      />

      {isDataMode ? (
        <FieldSelectionDock dataMode={dataMode} onApply={handleApplyDataMode} />
      ) : composerMode ? (
        <div className={styles.composerShell}>
          <ChatComposerDock
            mode={session.mode}
            composer={composerMode}
            categoryTabsMode={showCategoryTabs ? cardMode : null}
          />
        </div>
      ) : (
        <div className={styles.scaffoldPanel}>
          {/* <p className={styles.scaffoldText}>
            {getStorefrontChatScaffoldCopy(session.mode)}
          </p> */}
        </div>
      )}
    </section>
  );
}
