import StepShell from '../../components/step-shell/StepShell';
import PageDesignEditor from '../../components/page-design/PageDesignEditor';

export default function PageDesignStep({ step }) {
  return (
    <StepShell
      eyebrow="2단계"
      title="페이지 디자인 설정"
      description="페이지 분위기와 핵심 스타일을 정해 주세요."
    >
      <PageDesignEditor
        pageAiDesign={step.pageAiDesign}
        pageAiMessages={step.pageAiMessages}
        onChangePrompt={step.setPagePrompt}
        onChangeTargetScope={step.setPageTargetScope}
        onApply={step.applyPageAiDesign}
        isApplying={step.isApplyingPageAiDesign}
        errorMessage={step.pageAiErrorMessage}
        representativeCategoryLabel={step.selectedProductCategoryName}
      />
    </StepShell>
  );
}
