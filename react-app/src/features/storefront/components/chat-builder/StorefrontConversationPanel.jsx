import DataSelectionStep from "../../pages/storefront-builder/DataSelectionStep";
import UnifiedDesignEditor from "../unified-design/UnifiedDesignEditor";
import SelectionSummaryCard from "./SelectionSummaryCard";
import styles from "./StorefrontConversationPanel.module.css";

function resolveAssistantPrompt(currentStep) {
  if (currentStep === 0) {
    return "수정할 데이터를 선택해주세요.";
  }

  if (currentStep === 1) {
    return "카드에 노출할 필드와 열을 고른 뒤 디자인 단계로 넘어가주세요.";
  }

  return "페이지 또는 카드 대상을 선택해서 디자인을 수정하고, 하단 저장 버튼으로 마무리해주세요.";
}

function buildDataSummaryMeta(option) {
  if (!option) {
    return [];
  }

  const meta = [];

  if (option.sourceFileName) {
    meta.push(option.sourceFileName);
  }

  if (Number.isFinite(option.rowCount)) {
    meta.push(`${option.rowCount}개 상품`);
  }

  return meta;
}

function buildVisibleFieldSummary(step) {
  const labelByKey = new Map(
    step.availableCategoryFields.map((field) => [field.key, field.label]),
  );

  return step.committedDataSelection.map(
    (fieldKey) => labelByKey.get(fieldKey) ?? fieldKey,
  );
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) {
    return "업데이트 정보 없음";
  }

  const parsedDate = new Date(updatedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return "업데이트 정보 없음";
  }

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");
  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

  return `마지막 업데이트 ${year}.${month}.${day} ${hours}:${minutes}`;
}

function ProductCategoryPicker({ step }) {
  return (
    <div className={styles.categoryGrid}>
      {step.productCategoryOptions.map((option) => {
        const isSelected =
          step.selectedProductCategoryName === option.categoryName;

        return (
          <article
            key={option.categoryName}
            className={`${styles.categoryCard} ${isSelected ? styles.categoryCardSelected : ""}`}
            data-testid={`chat-product-category-card-${option.categoryName}`}
            data-selected={isSelected ? "true" : "false"}
          >
            <div className={styles.categoryHeader}>
              <div>
                <h3 className={styles.categoryTitle}>{option.categoryName}</h3>
                <p className={styles.categoryFileName}>
                  {option.sourceFileName || "등록된 원본 파일"}
                </p>
                <p className={styles.categoryUpdatedAt}>
                  {formatUpdatedAt(option.updatedAt)}
                </p>
              </div>
              <span className={styles.categoryRowCount}>
                {option.rowCount}개 상품
              </span>
            </div>

            <div className={styles.categoryMetaList}>
              <span className={styles.categoryMetaPill}>
                {option.hasDraft ? "임시저장 있음" : "새 데이터"}
              </span>
            </div>

            <button
              type="button"
              className={`${styles.categoryButton} ${isSelected ? styles.categoryButtonSelected : ""}`}
              data-testid={`chat-select-product-category-${option.categoryName}`}
              onClick={() => step.selectProductCategory(option.categoryName)}
            >
              {isSelected ? "이 데이터 수정하기" : "이 데이터 선택하기"}
            </button>
          </article>
        );
      })}
    </div>
  );
}

export default function StorefrontConversationPanel({ builder }) {
  const isDataStage = builder.currentStep === 0;
  const isFieldStage = builder.currentStep === 1;
  const isDesignStage = builder.currentStep === 2;
  const selectedDataOption =
    builder.productCategoryStep.productCategoryOptions.find(
      (option) =>
        option.categoryName ===
        builder.productCategoryStep.selectedProductCategoryName,
    ) ?? null;
  const visibleFieldLabels = buildVisibleFieldSummary(
    builder.dataSelectionStep,
  );

  return (
    <section className={styles.panel}>
      <div className={styles.thread}>
        <div className={styles.assistantCard}>
          <p className={styles.assistantText}>
            {resolveAssistantPrompt(builder.currentStep)}
          </p>
        </div>

        {!isDataStage ? (
          <SelectionSummaryCard
            title="선택된 데이터"
            description={
              selectedDataOption
                ? `${selectedDataOption.categoryName} 데이터를 수정 중입니다.`
                : "수정할 데이터를 선택해주세요."
            }
            meta={buildDataSummaryMeta(selectedDataOption)}
            actionLabel="다시 선택"
            actionTestId="chat-reopen-data-selection"
            onAction={builder.conversationFlow.reopenCategorySelection}
            testId="chat-summary-selected-data"
          />
        ) : null}

        {isDataStage ? (
          <section
            className={styles.stageCard}
            data-testid="chat-stage-data-picker"
          >
            <ProductCategoryPicker step={builder.productCategoryStep} />
          </section>
        ) : null}

        {isDesignStage ? (
          <SelectionSummaryCard
            title="노출 필드"
            description={`${visibleFieldLabels.length}개 필드를 카드에 노출합니다.`}
            meta={visibleFieldLabels}
            actionLabel="필드 다시 고르기"
            actionTestId="chat-reopen-field-selection"
            onAction={builder.conversationFlow.reopenFieldSelection}
            testId="chat-summary-visible-fields"
          />
        ) : null}

        {isFieldStage ? (
          <section
            className={styles.stageCard}
            data-testid="chat-stage-field-picker"
          >
            <DataSelectionStep step={builder.dataSelectionStep} />
          </section>
        ) : null}

        {isFieldStage ? (
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="chat-field-selection-back"
              onClick={builder.conversationFlow.reopenCategorySelection}
            >
              이전
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              data-testid="chat-confirm-field-selection"
              onClick={builder.dataSelectionStep.confirmDataSelection}
            >
              디자인 수정하기
            </button>
          </div>
        ) : null}

        {isDesignStage ? (
          <section className={styles.stageCard}>
            <UnifiedDesignEditor
              selectedTarget={builder.unifiedDesignStep.selectedTarget}
              onChangeTarget={builder.unifiedDesignStep.setSelectedTarget}
              promptDraft={builder.unifiedDesignStep.promptDraft}
              onChangePrompt={builder.unifiedDesignStep.setPromptDraft}
              messages={builder.unifiedDesignStep.messages}
              pageTargetScope={builder.unifiedDesignStep.pageTargetScope}
              cardTargetScope={builder.unifiedDesignStep.cardTargetScope}
              onChangePageScope={builder.unifiedDesignStep.setPageTargetScope}
              onChangeCardScope={builder.unifiedDesignStep.setCardTargetScope}
              onApply={builder.unifiedDesignStep.applyUnifiedAiDesign}
              isApplying={builder.unifiedDesignStep.isApplying}
              errorMessage={builder.unifiedDesignStep.errorMessage}
              canUndo={builder.unifiedDesignStep.canUndoAiChanges}
              onUndo={builder.unifiedDesignStep.undoAiChanges}
              cardStyle={builder.unifiedDesignStep.cardStyle}
              onChangeCardsPerRow={builder.unifiedDesignStep.setCardsPerRow}
              representativeCategoryLabel={
                builder.unifiedDesignStep.selectedProductCategoryName
              }
            />

            <p className={styles.helperNote}>
              QR과 공개 스토어 링크는 저장 후 대시보드에서 확인할 수 있습니다.
            </p>
          </section>
        ) : null}

        {isDesignStage ? (
          <div className={`${styles.actionRow} ${styles.actionRowSticky}`}>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="chat-design-back"
              onClick={builder.conversationFlow.reopenFieldSelection}
            >
              이전
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              data-testid="chat-save-storefront-draft"
              onClick={builder.unifiedDesignStep.saveDraft}
              disabled={builder.unifiedDesignStep.status === "saving"}
            >
              {builder.unifiedDesignStep.status === "saving"
                ? "저장 중.."
                : "저장"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
