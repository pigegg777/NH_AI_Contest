import CategoryTabs from '../category-tabs/CategoryTabs';
import DataFieldGroupTable from './DataFieldGroupTable';
import {
  PAGE_DESCRIPTION_PLACEHOLDER,
  StorefrontTextFields,
} from './StorefrontTextFields';
import { groupAvailableFields } from '../../../model/data-selection/dataSelectionFieldGroupModel';
import styles from './FieldSelectionDock.module.css';

const COMMON_TAB_ID = 'common';

export default function FieldSelectionDock({ dataMode, onApply }) {
  const groups = groupAvailableFields(dataMode.availableCategoryFields);

  return (
    <section
      className={styles.dock}
      data-testid="storefront-field-selection-dock"
    >
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h3 className={styles.title}>표시항목 선택</h3>
          <p className={styles.subtitle}>
            고객용 상품 카드에 표시할 항목을 선택하세요.
          </p>
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

      <div className={styles.categoryTabsWrap}>
        <CategoryTabs categoryTabsMode={dataMode} />
      </div>

      {dataMode.selectedCategoryId === COMMON_TAB_ID ? (
        <StorefrontTextFields
          fields={[
            {
              id: 'pageTitle',
              label: '페이지 제목',
              value: dataMode.textDraft.pageTitle,
              placeholder: dataMode.derivedPageTitle,
              hint: '비워두면 위 문구가 그대로 표시됩니다.',
            },
            {
              id: 'pageDescription',
              label: '페이지 설명',
              value: dataMode.textDraft.pageDescription,
              placeholder: PAGE_DESCRIPTION_PLACEHOLDER,
              fillLabel: '예시문구 넣기',
              multiline: true,
              hint: '비워두면 제목 아래에 아무것도 표시되지 않습니다.',
            },
          ]}
          onChange={dataMode.setTextDraft}
        />
      ) : (
        <>
          <StorefrontTextFields
            fields={[
              {
                id: 'categoryDescription',
                label: '분류 설명',
                value: dataMode.textDraft.categoryDescription,
                placeholder: '이 분류 상품 목록 위에 보여줄 안내 문구',
                multiline: true,
                hint: '줄바꿈한 그대로 표시됩니다. 비워두면 아무것도 표시되지 않습니다.',
              },
            ]}
            onChange={dataMode.setTextDraft}
          />

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
        </>
      )}
    </section>
  );
}
