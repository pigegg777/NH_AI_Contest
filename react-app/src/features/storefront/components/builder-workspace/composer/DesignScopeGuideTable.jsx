import styles from "./ChatComposerDock.module.css";

/** Deals the guide rows into two side-by-side halves so the table stays short. */
function splitRowsInHalf(rows) {
  const half = Math.ceil(rows.length / 2);

  return rows.slice(0, half).map((row, index) => ({
    left: row,
    right: rows[half + index] ?? null,
  }));
}

/** The "무엇을 바꿀 수 있는지" table shown under the scope chips. */
export default function DesignScopeGuideTable({ guide }) {
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
