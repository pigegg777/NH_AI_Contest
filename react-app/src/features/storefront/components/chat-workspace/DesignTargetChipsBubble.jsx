import { useState } from "react";

import styles from "./ChatComposerDock.module.css";

const ALL_TARGET_CHIP = { id: "", label: "전체" };
const SCOPE_GUIDE_PANEL_ID = "storefront-design-scope-guide";

function ScopeGuidePanel({ guide, onClose }) {
  return (
    <div
      className={styles.scopeGuidePanel}
      id={SCOPE_GUIDE_PANEL_ID}
      data-testid="storefront-design-scope-guide"
    >
      <div className={styles.scopeGuideHeader}>
        <p className={styles.scopeGuideTitle}>
          {guide.title}에서 바꿀 수 있는 것
        </p>
        <button
          type="button"
          className={styles.scopeGuideClose}
          aria-label="안내 닫기"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <table className={styles.scopeGuideTable}>
        <thead>
          <tr>
            <th scope="col">수정 가능 요소</th>
            <th scope="col">프롬프트 요청 예시</th>
          </tr>
        </thead>
        <tbody>
          {guide.rows.map((row) => (
            <tr key={row.element}>
              <th scope="row">{row.element}</th>
              <td>{row.example}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {guide.note ? <p className={styles.scopeGuideNote}>{guide.note}</p> : null}
    </div>
  );
}

export default function DesignTargetChipsBubble({
  label,
  options,
  selectedTargetId,
  onSelectTarget,
  getScopeGuide,
}) {
  const [openGuideScopeId, setOpenGuideScopeId] = useState(null);

  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  const chips = [ALL_TARGET_CHIP, ...options];
  const openGuide =
    openGuideScopeId === null || !getScopeGuide
      ? null
      : getScopeGuide(openGuideScopeId);

  function toggleGuide(scopeId) {
    setOpenGuideScopeId((current) => (current === scopeId ? null : scopeId));
  }

  return (
    <div
      className={styles.targetBubble}
      data-testid="storefront-design-target-chips"
    >
      <p className={styles.targetBubbleLabel}>{label}</p>

      <div className={styles.targetChipList} role="list">
        {chips.map((chip) => {
          const isSelected = chip.id === (selectedTargetId ?? "");
          const guide = getScopeGuide ? getScopeGuide(chip.id) : null;
          const isGuideOpen = openGuideScopeId === chip.id;

          return (
            <span
              key={chip.id || "all"}
              className={
                isSelected ? styles.targetChipGroupActive : styles.targetChipGroup
              }
            >
              <button
                type="button"
                className={styles.targetChipButton}
                onClick={() => onSelectTarget(chip.id)}
              >
                {chip.label}
              </button>

              {guide ? (
                <button
                  type="button"
                  className={
                    isGuideOpen
                      ? styles.targetChipInfoActive
                      : styles.targetChipInfo
                  }
                  aria-label={`${chip.label}에서 바꿀 수 있는 것 보기`}
                  aria-expanded={isGuideOpen}
                  aria-controls={SCOPE_GUIDE_PANEL_ID}
                  onClick={() => toggleGuide(chip.id)}
                >
                  i
                </button>
              ) : null}
            </span>
          );
        })}
      </div>

      {openGuide ? (
        <ScopeGuidePanel
          guide={openGuide}
          onClose={() => setOpenGuideScopeId(null)}
        />
      ) : null}
    </div>
  );
}
