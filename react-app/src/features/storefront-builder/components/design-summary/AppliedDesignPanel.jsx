import { useState } from 'react';

import styles from './AppliedDesignPanel.module.css';

/**
 * 미리보기에 지금 적용된 디자인을 사장님 말로 보여준다.
 *
 * 여기서는 아무것도 해석하지 않는다 — 토큰을 우리말로 옮기는 일은 전부
 * model/design-summary 가 이미 끝냈고, 이 파일은 받은 것을 그리기만 한다.
 *
 * 대화 패널 안 맨 위에 붙어 있고(sticky), 왼쪽은 페이지 전체, 오른쪽은 지금
 * 고른 분류의 카드다. 둘을 나란히 두는 이유: 사장님이 바꾸는 대상이 둘 중
 * 하나라서, 어느 쪽 이야기인지가 위치로 구분되면 읽는 수고가 준다.
 */
function SummaryGroup({ group }) {
  return (
    <div className={styles.group}>
      <p className={styles.groupTitle}>{group.title}</p>
      <dl className={styles.rows}>
        {group.items.map((item) => (
          // 묶음 이름은 사장님이 지은 것이라 서로 같을 수 있어 label 을 키로 쓸 수 없다.
          <div className={styles.row} key={item.key ?? item.label}>
            <dt className={styles.rowLabel}>{item.label}</dt>
            <dd className={styles.rowValue}>
              {item.kind === 'color' ? (
                <span
                  className={styles.swatch}
                  style={{ background: item.swatchHex }}
                  // 색은 눈으로 보는 것이고, 화면 낭독기에는 색 이름이 없으니
                  // 최소한 어떤 자리의 색인지는 읽히게 한다.
                  aria-label={`${item.label} 색상`}
                  role="img"
                />
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SummaryColumn({ title, groups }) {
  return (
    <div className={styles.column}>
      <p className={styles.sectionTitle}>{title}</p>
      {groups.map((group) => (
        <SummaryGroup group={group} key={group.id} />
      ))}
    </div>
  );
}

export default function AppliedDesignPanel({ summary }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!summary) {
    return null;
  }

  const { headline, page, card, categoryName } = summary;

  return (
    <section className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span className={styles.toggleMain}>
          <span className={styles.toggleTitle}>지금 적용된 디자인</span>
          <span className={styles.headline}>
            <span className={styles.swatchRow}>
              {headline.swatches.map((swatch) => (
                <span
                  key={swatch.label}
                  className={styles.swatchDot}
                  style={{ background: swatch.hex }}
                  aria-label={swatch.label}
                  role="img"
                />
              ))}
            </span>
            <span className={styles.headlineFacts}>{headline.facts.join(' · ')}</span>
          </span>
        </span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className={styles.body}>
          <SummaryColumn title="페이지 전체" groups={page} />

          {/* 카드 디자인은 분류마다 따로 저장된다. 미리보기가 안내를 띄우고
              있거나 고른 분류가 없으면 화면에 카드가 한 장도 없으므로 이 열
              자체를 내보내지 않는다 — 빈 자리를 설명으로 채우는 것보다
              없는 편이 사실에 가깝다. */}
          {card ? (
            <SummaryColumn title={`${categoryName} 카드`} groups={card} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
