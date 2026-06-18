import panelStyles from '../../office-product-editor/components/shared/panel.module.css';
import StepShell from './StepShell';
import styles from '../pages/StorefrontBuilderPage.module.css';

function renderExampleValue(field, value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map((item) => (item !== null && typeof item === 'object' ? '{...}' : String(item)))
      .join(', ');

    return `[${preview}${value.length > 3 ? ', ...' : ''}]`;
  }

  if (typeof value === 'object') {
    return (
      <a
        href="#"
        className={styles.fieldExampleLink}
        title={JSON.stringify(value).slice(0, 200)}
        onClick={(e) => e.preventDefault()}
      >
        보기
      </a>
    );
  }

  if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    return (
      <a href={value} className={styles.fieldExampleLink} target="_blank" rel="noreferrer">
        보기
      </a>
    );
  }

  if (field === 'tax_price') {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()}원` : String(value);
  }

  return String(value);
}

function getRepresentativeProductRow(builder) {
  const rows = Array.isArray(builder.currentEntry?.rows) ? builder.currentEntry.rows : [];

  if (!rows.length) {
    return null;
  }

  return (
    rows.find((row) => row?.medium_category === builder.representativeMediumCategory) ??
    rows.find((row) => builder.selectedMediumCategories.includes(row?.medium_category)) ??
    rows[0]
  );
}

export default function AiStudioStep({ builder }) {
  const exampleProductRow = getRepresentativeProductRow(builder);
  const availableFields = builder.availableCategoryFields;

  return (
    <StepShell
      eyebrow="2단계"
      title="AI 페이지 초안 생성"
      description="원하는 방향을 입력하고 AI로 페이지 초안을 바로 생성해보세요."
    >
      <section className={styles.controlCard}>
        <div className={styles.sectionStack}>
          <h3 className={styles.sectionTitle}>상품카드에 보여줄 내용</h3>
          <p className={styles.sectionHint}>
            선택한 카테고리의 대표 상품 데이터를 보고, 카드에 노출할 필드를 골라보세요.
          </p>
        </div>

        <div className={styles.fieldTableWrap}>
          <table className={styles.fieldTable} data-testid="card-field-table">
            <thead>
              <tr>
                <th scope="col">필드</th>
                <th scope="col">예시 값</th>
                <th scope="col">표시 여부</th>
              </tr>
            </thead>
            <tbody>
              {availableFields.map(({ key, label, isSelectable }) => {
                const isVisible = builder.cardFields.includes(key);
                const isLastVisibleField = isVisible && builder.cardFields.length === 1;
                const rawValue = exampleProductRow?.[key];
                const exampleDisplay = renderExampleValue(key, rawValue);
                const exampleTitle =
                  typeof exampleDisplay === 'string'
                    ? exampleDisplay
                    : rawValue != null
                      ? String(rawValue).slice(0, 100)
                      : '예시 데이터 없음';

                return (
                  <tr key={key} data-testid={`card-field-row-${key}`}>
                    <th scope="row" className={styles.fieldTableHeading}>
                      <div className={styles.fieldNameBlock}>
                        <span>{label}</span>
                        <span className={styles.fieldKey}>{key}</span>
                      </div>
                    </th>
                    <td className={styles.fieldTableValueCell}>
                      <span
                        className={styles.fieldTableValue}
                        data-testid={`card-field-example-${key}`}
                        title={exampleTitle}
                      >
                        {exampleDisplay ?? '-'}
                      </span>
                    </td>
                    <td className={styles.fieldTableToggleCell}>
                      {isSelectable ? (
                        <label className={styles.fieldToggle}>
                          <input
                            type="checkbox"
                            checked={isVisible}
                            disabled={isLastVisibleField}
                            data-testid={`card-field-toggle-${key}`}
                            onChange={() => builder.toggleCardField(key)}
                          />
                          <span>{isVisible ? '표시' : '숨김'}</span>
                        </label>
                      ) : (
                        <span
                          className={styles.fieldDisabled}
                          title="배열 또는 객체 값은 카드에 표시할 수 없습니다"
                        >
                          선택 불가
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className={styles.tableHelperText}>체크를 바꾸면 오른쪽 미리보기가 바로 업데이트됩니다.</p>
      </section>

      <label className={styles.inputLabel}>
        <span>AI로 다듬기</span>
        <textarea
          className={styles.textarea}
          value={builder.aiPrompt}
          onChange={(event) => builder.setAiPrompt(event.target.value)}
          placeholder="예시: 고객이 가격을 빠르게 비교할 수 있게 비료 상품을 강조하고, 모바일에서 읽기 쉬운 안내 페이지로 정리해줘."
        />
      </label>

      {builder.aiSummary ? <p className={styles.summary}>{builder.aiSummary}</p> : null}

      {builder.aiChangeSummary.length > 0 ? (
        <section className={styles.controlCard} data-testid="ai-change-summary-panel">
          <div className={styles.controlCardHeader}>
            <div className={styles.sectionStack}>
              <h3 className={styles.sectionTitle}>AI 변경 요약</h3>
              <p className={styles.sectionHint}>AI가 반영한 변경 내용을 바로 확인할 수 있습니다.</p>
            </div>
            <button
              type="button"
              className={styles.secondaryButton}
              data-testid="undo-ai-changes"
              onClick={builder.undoAiChanges}
            >
              AI 되돌리기
            </button>
          </div>

          <ul className={styles.summaryList} data-testid="ai-change-summary">
            {builder.aiChangeSummary.map((item) => (
              <li key={item} className={styles.summaryItem}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="apply-ai-suggestion"
          onClick={builder.applyAiSuggestion}
          disabled={builder.isAiApplying}
        >
          {builder.isAiApplying ? '적용 중...' : 'AI 초안 적용'}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          data-testid="save-storefront-draft"
          onClick={builder.saveDraft}
          disabled={builder.status === 'saving'}
        >
          {builder.status === 'saving' ? '저장 중...' : '초안 저장'}
        </button>
      </div>

      {builder.aiErrorMessage ? <div className={panelStyles.errorBox}>{builder.aiErrorMessage}</div> : null}
    </StepShell>
  );
}
