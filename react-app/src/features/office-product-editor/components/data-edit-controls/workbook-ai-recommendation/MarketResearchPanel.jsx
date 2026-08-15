import { MarketResearchReportBody } from './MarketResearchReportBody';
import primitives from './panelPrimitives.module.css';
import styles from './MarketResearchPanel.module.css';

export function MarketResearchPanel({ marketResearch }) {
  if (!marketResearch) {
    return null;
  }

  const { isLoading, mode } = marketResearch;

  if (!isLoading && mode === 'idle') {
    return null;
  }

  return (
    <section className={`${primitives.panel} ${primitives.compactPanel}`}>
      <div className={primitives.panelHeader}>
        <h2 className={primitives.panelTitle}>🔎 시장조사</h2>
      </div>
      <div className={`${primitives.recommendationCard} ${styles.marketResearchCard}`}>
        <MarketResearchReportBody marketResearch={marketResearch} />
      </div>
    </section>
  );
}
