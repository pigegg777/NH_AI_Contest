import { useState } from 'react';

import StepShell from '../../components/step-shell/StepShell';
import CardDesignEditor from '../../components/card-design/CardDesignEditor';
import StorefrontQrExportCard from '../../components/qr-export/StorefrontQrExportCard';
import styles from './CardDesignStep.module.css';

export default function CardDesignStep({ step }) {
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  return (
    <StepShell
      eyebrow="4단계"
      title="카드 디자인"
      description="확정된 데이터를 바탕으로 카드 디자인을 다듬어보세요."
    >
      <CardDesignEditor
        cardStyle={step.cardStyle}
        cardAiDesign={step.cardAiDesign}
        onChangePrompt={step.setPrompt}
        onChangeTargetScope={step.setTargetScope}
        onChangeCardsPerRow={step.setCardsPerRow}
        onApply={step.applyAiSuggestion}
        onUndo={step.undoAiChanges}
        canUndo={step.canUndoAiChanges}
        isApplying={step.isAiApplying}
        errorMessage={step.aiErrorMessage}
        warningMessage={step.cardAiWarningMessage}
      />

      <StorefrontQrExportCard
        qrExport={step.qrExport}
        isDialogOpen={isQrDialogOpen}
        onCloseDialog={() => setIsQrDialogOpen(false)}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="save-storefront-draft"
          onClick={step.saveDraft}
          disabled={step.status === 'saving'}
        >
          {step.status === 'saving' ? '저장 중...' : '초안 저장'}
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          data-testid="open-storefront-qr-export"
          onClick={() => setIsQrDialogOpen(true)}
          disabled={!step.qrExport?.isAvailable || step.status === 'saving'}
        >
          QR 내보내기
        </button>
      </div>
    </StepShell>
  );
}
