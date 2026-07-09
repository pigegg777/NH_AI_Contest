import StepShell from '../../components/step-shell/StepShell';
import DataFieldGroupTable from '../../components/data-selection/DataFieldGroupTable';
import { groupAvailableFields } from '../../model/data-selection/dataSelectionFieldGroupModel';
import styles from './DataSelectionStep.module.css';

function toggleGroupedField(step, field) {
  const keys = field.aliasKeys ?? [field.key];
  const isVisible = keys.some((key) => step.draftDataSelection.includes(key));
  const makeVisible = !isVisible;

  keys.forEach((key) => {
    const isKeyVisible = step.draftDataSelection.includes(key);

    if (isKeyVisible !== makeVisible) {
      step.toggleDraftField(key);
    }
  });
}

export default function DataSelectionStep({ step }) {
  const groups = groupAvailableFields(step.availableCategoryFields);

  return (
    <StepShell
      eyebrow="2단계"
      title="데이터 선택"
      description="카드에 보여줄 데이터를 먼저 확정해 주세요. 디자인은 다음 단계에서 다룹니다."
    >
      <section className={styles.controlCard}>
        <DataFieldGroupTable
          groupLabel="설명 정보"
          fields={groups.description}
          draftFields={step.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(step, field)}
          testId="data-field-table-description"
        />
        <DataFieldGroupTable
          groupLabel="가격 정보"
          fields={groups.price}
          draftFields={step.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(step, field)}
          testId="data-field-table-price"
        />
        <DataFieldGroupTable
          groupLabel="분류 정보"
          fields={groups.category}
          draftFields={step.draftDataSelection}
          onToggleField={(field) => toggleGroupedField(step, field)}
          testId="data-field-table-category"
        />
        <p className={styles.tableHelperText}>
          체크를 바꾸면 선택 상태가 바로 업데이트됩니다.
        </p>
      </section>

      {!step.isDataSelectionConfirmed ? (
        <p
          className={styles.sectionHint}
          data-testid="data-selection-unconfirmed-hint"
        >
          변경 사항이 있습니다. 확인을 눌러야 다음 단계로 이동할 수 있어요.
        </p>
      ) : null}
    </StepShell>
  );
}
