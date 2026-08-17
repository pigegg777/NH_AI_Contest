import { AiMarketResearchReportBody } from './AiMarketResearchReportBody';
import primitives from '../shared/panelPrimitives.module.css';
import styles from './AiMarketResearchPanel.module.css';

export function AiMarketResearchPanel({ marketResearch }) {
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
        <AiMarketResearchReportBody marketResearch={marketResearch} />
      </div>
    </section>
  );
}
