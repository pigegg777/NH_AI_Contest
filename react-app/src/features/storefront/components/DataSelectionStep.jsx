import DataFieldGroupTable from './data-selection/DataFieldGroupTable';
import DataSelectionPreviewGrid from './data-selection/DataSelectionPreviewGrid';
import StepShell from './StepShell';
import { groupAvailableFields } from '../model/dataSelectionFieldGroupModel';
import styles from '../pages/StorefrontBuilderPage.module.css';

function toggleGroupedField(builder, field) {
  const keys = field.aliasKeys ?? [field.key];
  const isVisible = keys.some((key) => builder.draftDataSelection.includes(key));
  const makeVisible = !isVisible;

  keys.forEach((key) => {
    const isKeyVisible = builder.draftDataSelection.includes(key);

    if (isKeyVisible !== makeVisible) {
      builder.toggleDraftField(key);
    }
  });
}

export default function DataSelectionStep({ builder }) {
  const groups = groupAvailableFields(builder.availableCategoryFields);
  const previewRows = Array.isArray(builder.currentEntry?.rows) ? builder.currentEntry.rows : [];

  function handleForwardClick() {
    if (builder.isDataSelectionConfirmed) {
      builder.goNext();
    } else {
      builder.confirmDataSelection();
    }
  }

  return (
    <StepShell
      eyebrow="2단계"
      title="데이터 선택"
      description="카드에 보여줄 데이터를 먼저 확정해 주세요. 디자인은 다음 단계에서 다듬습니다."
    >
      <section className={styles.controlCard}>
        <DataFieldGroupTable
          groupLabel="설명 정보"
          fields={groups.description}
          draftFields={builder.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(builder, field)}
          testId="data-field-table-description"
        />
        <DataFieldGroupTable
          groupLabel="가격 정보"
          fields={groups.price}
          draftFields={builder.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(builder, field)}
          testId="data-field-table-price"
        />
        <DataFieldGroupTable
          groupLabel="분류 정보"
          fields={groups.category}
          draftFields={builder.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(builder, field)}
          testId="data-field-table-category"
        />
        <p className={styles.tableHelperText}>체크를 바꾸면 아래 미리보기가 바로 업데이트됩니다.</p>
      </section>

      <section className={styles.controlCard}>
        <h3 className={styles.sectionTitle}>전체 상품 미리보기</h3>
        <DataSelectionPreviewGrid productRows={previewRows} fields={builder.availableCategoryFields.filter((f) => builder.draftDataSelection.includes(f.key))} />
      </section>

      {!builder.isDataSelectionConfirmed ? (
        <p className={styles.sectionHint} data-testid="data-selection-unconfirmed-hint">
          변경 사항이 있습니다. 확인을 눌러야 다음 단계로 이동할 수 있어요.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="confirm-data-selection"
          onClick={handleForwardClick}
        >
          {builder.isDataSelectionConfirmed ? '다음 단계로' : '확인하고 다음 단계로'}
        </button>
      </div>
    </StepShell>
  );
}
