import styles from "./ChatComposerDock.module.css";
import CardChoiceRow from "./CardChoiceRow";
import DesignScopeGuideTable from "./DesignScopeGuideTable";
import { StorefrontTextFields } from "../field-selection/StorefrontTextFields";

const ALL_TARGET_CHIP = { id: "", label: "전체" };
// The page title is merchant-authored copy, not something the AI writes, so it is
// edited by hand on the one chip whose styling it belongs to.
const PAGE_TITLE_SCOPE_ID = "header";
const CARDS_PER_ROW_OPTIONS = [
  { value: 1, label: "1개" },
  { value: 2, label: "2개" },
];

export default function DesignTargetChipsBubble({
  label,
  options,
  selectedTargetId,
  onSelectTarget,
  getScopeGuide,
  cardsPerRow,
  onChangeCardsPerRow,
  layoutOptions,
  selectedLayoutId,
  onChangeLayout,
  pageTitleDraft,
  onChangePageTitle,
  pageTitlePlaceholder,
}) {
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  const chips = [ALL_TARGET_CHIP, ...options];
  const selectedChipId = selectedTargetId ?? "";
  const selectedGuide = getScopeGuide ? getScopeGuide(selectedChipId) : null;
  // Card count and layout apply to the whole card, so they only make sense on 전체.
  const isAllScope = selectedChipId === "";
  const showCardsPerRow = isAllScope && Boolean(onChangeCardsPerRow);
  const showLayout =
    isAllScope &&
    Boolean(onChangeLayout) &&
    Array.isArray(layoutOptions) &&
    layoutOptions.length > 0;
  const showPageTitle =
    selectedChipId === PAGE_TITLE_SCOPE_ID && Boolean(onChangePageTitle);

  return (
    <div
      className={styles.targetBubble}
      data-testid="storefront-design-target-chips"
    >
      <p className={styles.targetBubbleLabel}>{label}</p>

      <div className={styles.targetChipList} role="list">
        {chips.map((chip) => {
          const isSelected = chip.id === selectedChipId;

          return (
            <button
              key={chip.id || "all"}
              type="button"
              className={
                isSelected
                  ? styles.targetChipButtonActive
                  : styles.targetChipButton
              }
              aria-pressed={isSelected}
              onClick={() => onSelectTarget(chip.id)}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {showCardsPerRow || showLayout ? (
        <div className={styles.cardControlsRow}>
          {showCardsPerRow ? (
            <CardChoiceRow
              label="1줄에 보여줄 상품 수"
              labelId="storefront-cards-per-row-label"
              testId="storefront-cards-per-row"
              options={CARDS_PER_ROW_OPTIONS}
              value={cardsPerRow}
              onChange={onChangeCardsPerRow}
            />
          ) : null}

          {showLayout ? (
            <CardChoiceRow
              label="카드 배치"
              labelId="storefront-card-layout-label"
              testId="storefront-card-layout"
              options={layoutOptions.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
              value={selectedLayoutId}
              onChange={onChangeLayout}
            />
          ) : null}
        </div>
      ) : null}

      {showPageTitle ? (
        <StorefrontTextFields
          fields={[
            {
              id: "pageTitle",
              label: "페이지 제목",
              value: pageTitleDraft ?? "",
              placeholder: pageTitlePlaceholder,
              hint: "비워두면 기본 제목이 그대로 표시됩니다.",
            },
          ]}
          onChange={(fieldId, value) => onChangePageTitle(value)}
        />
      ) : null}

      {selectedGuide ? <DesignScopeGuideTable guide={selectedGuide} /> : null}
    </div>
  );
}
