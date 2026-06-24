import { PAGE_AI_TARGET_SCOPE_OPTIONS } from '../../model/pageAiDesignModel';
import AiChatPanel from '../ai-chat/AiChatPanel';
import PageStylePromptField from './PageStylePromptField';
import styles from './PageDesignEditor.module.css';

export default function PageDesignEditor({
  pageAiDesign,
  pageAiMessages,
  onChangePrompt,
  onChangeTargetScope,
  onApply,
  isApplying,
  errorMessage,
  representativeCategoryLabel,
}) {
  return (
    <div className={styles.editor} data-testid="page-design-editor">
      {representativeCategoryLabel ? (
        <p className={styles.metaLine}>기준 카테고리: {representativeCategoryLabel}</p>
      ) : null}

      <AiChatPanel
        panelTestId="page-design-prompt-panel"
        messages={pageAiMessages}
        scopeOptions={PAGE_AI_TARGET_SCOPE_OPTIONS}
        selectedScope={pageAiDesign.targetScope}
        onScopeChange={onChangeTargetScope}
        scopeTestIdPrefix="page-design-scope"
        scopeListTestId="page-design-scope-list"
        inputField={
          <PageStylePromptField
            value={pageAiDesign.prompt}
            onChange={onChangePrompt}
            describedBy="page-style-prompt-help"
          />
        }
        onSend={onApply}
        sendLabel="페이지 스타일 적용"
        sendTestId="apply-page-ai-design"
        isSending={isApplying}
        errorMessage={errorMessage}
        emptyStateText="원하는 분위기를 자세히 적어 주세요. 예: 신뢰감 있는 블루 톤으로 정리하고, 제목은 조금 더 굵게 해줘"
      />
    </div>
  );
}
