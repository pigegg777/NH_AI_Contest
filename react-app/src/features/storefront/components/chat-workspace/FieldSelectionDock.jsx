import CategoryTabs from './CategoryTabs';
import DataFieldGroupTable from '../data-selection/DataFieldGroupTable';
import { groupAvailableFields } from '../../model/data-selection/dataSelectionFieldGroupModel';
import styles from './FieldSelectionDock.module.css';

export default function FieldSelectionDock({ dataMode, onApply }) {
  const groups = groupAvailableFields(dataMode.availableCategoryFields);
  const selectedTab = dataMode.categoryTabs.find(
    (tab) => tab.id === dataMode.selectedCategoryId,
  );
  const selectedCount = dataMode.draftFields.length;

  return (
    <section
      className={styles.dock}
      data-testid="storefront-field-selection-dock"
    >
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>표시 필드</p>
          <h3 className={styles.title}>
            {selectedTab?.label || '선택된 카테고리'}
          </h3>
        </div>
        {/* <div className={styles.summary}>
          <span className={styles.summaryValue}>{selectedCount}</span>
          <span className={styles.summaryLabel}>개 필드 표시 중</span>
        </div> */}

        <div className={styles.footer}>
          <div className={styles.footerActions}>
            {!dataMode.hasPendingChanges ? (
              <button
                type="button"
                className={styles.backButton}
                onClick={dataMode.goBack}
              >
                뒤로가기
              </button>
            ) : null}

            <button
              type="button"
              className={styles.applyButton}
              onClick={onApply}
            >
              저장하기
            </button>
          </div>
        </div>
      </div>

      <CategoryTabs categoryTabsMode={dataMode} />

      <div className={styles.tables}>
        <DataFieldGroupTable
          groupLabel="상품개요"
          fields={groups.description}
          draftFields={dataMode.draftFields}
          onToggleField={dataMode.toggleField}
          testId="data-field-table-description"
        />
        <DataFieldGroupTable
          groupLabel="가격"
          fields={groups.price}
          draftFields={dataMode.draftFields}
          onToggleField={dataMode.toggleField}
          testId="data-field-table-price"
        />
        <DataFieldGroupTable
          groupLabel="분류"
          fields={groups.category}
          draftFields={dataMode.draftFields}
          onToggleField={dataMode.toggleField}
          testId="data-field-table-category"
        />
      </div>
    </section>
  );
}
