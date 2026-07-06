import StepShell from '../../components/step-shell/StepShell';
import UnifiedDesignEditor from '../../components/unified-design/UnifiedDesignEditor';
import styles from './UnifiedDesignStep.module.css';

export default function UnifiedDesignStep({ step }) {
  return (
    <StepShell
      eyebrow="3단계"
      title="통합 디자인 조정"
      description="페이지와 카드를 하나의 대화 흐름에서 조정해 보세요. 현재 선택한 대상에만 변경이 적용됩니다."
    >
      <UnifiedDesignEditor
        selectedTarget={step.selectedTarget}
        onChangeTarget={step.setSelectedTarget}
        promptDraft={step.promptDraft}
        onChangePrompt={step.setPromptDraft}
        messages={step.messages}
        pageTargetScope={step.pageTargetScope}
        cardTargetScope={step.cardTargetScope}
        onChangePageScope={step.setPageTargetScope}
        onChangeCardScope={step.setCardTargetScope}
        onApply={step.applyUnifiedAiDesign}
        isApplying={step.isApplying}
        errorMessage={step.errorMessage}
        canUndo={step.canUndoAiChanges}
        onUndo={step.undoAiChanges}
        cardStyle={step.cardStyle}
        onChangeCardsPerRow={step.setCardsPerRow}
        representativeCategoryLabel={step.selectedProductCategoryName}
      />

      <p className={styles.helperNote}>
        고객용 QR은 공개 스토어를 저장한 뒤 대시보드에서 확인할 수 있습니다.
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="save-storefront-draft"
          onClick={step.saveDraft}
          disabled={step.status === 'saving'}
        >
          {step.status === 'saving' ? '저장 중..' : '초안 저장'}
        </button>
      </div>
    </StepShell>
  );
}
