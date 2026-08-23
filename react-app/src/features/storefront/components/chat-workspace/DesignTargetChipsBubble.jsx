import styles from "./ChatComposerDock.module.css";

const ALL_TARGET_CHIP = { id: "", label: "전체" };

function splitRowsInHalf(rows) {
  const half = Math.ceil(rows.length / 2);

  return rows.slice(0, half).map((row, index) => ({
    left: row,
    right: rows[half + index] ?? null,
  }));
}

function ScopeGuidePanel({ guide }) {
  const rowPairs = splitRowsInHalf(guide.rows);

  return (
    <div
      className={styles.scopeGuidePanel}
      data-testid="storefront-design-scope-guide"
    >
      <p className={styles.scopeGuideTitle}>
        {guide.title}에서 바꿀 수 있는 것
      </p>

      <table className={styles.scopeGuideTable}>
        <thead>
          <tr>
            <th scope="col">수정 가능 요소</th>
            <th scope="col">프롬프트 요청 예시</th>
            <th scope="col" className={styles.scopeGuideSplit}>
              수정 가능 요소
            </th>
            <th scope="col">프롬프트 요청 예시</th>
          </tr>
        </thead>
        <tbody>
          {rowPairs.map((pair) => (
            <tr key={pair.left.element}>
              <th scope="row">{pair.left.element}</th>
              <td>{pair.left.example}</td>
              {pair.right ? (
                <>
                  <th scope="row" className={styles.scopeGuideSplit}>
                    {pair.right.element}
                  </th>
                  <td>{pair.right.example}</td>
                </>
              ) : (
                <td className={styles.scopeGuideSplit} colSpan={2} />
              )}
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
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  const chips = [ALL_TARGET_CHIP, ...options];
  const selectedChipId = selectedTargetId ?? "";
  const selectedGuide = getScopeGuide ? getScopeGuide(selectedChipId) : null;

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

      {selectedGuide ? <ScopeGuidePanel guide={selectedGuide} /> : null}
    </div>
  );
}
