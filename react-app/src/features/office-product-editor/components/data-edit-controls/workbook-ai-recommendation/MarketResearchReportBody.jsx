import styles from './MarketResearchReportBody.module.css';

function formatKrw(amount) {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function MarketResearchReportBody({ marketResearch }) {
  const { isLoading, mode, report, message } = marketResearch;

  if (isLoading) {
    return <p className={styles.marketResearchStatus}>시장조사 중...</p>;
  }

  if (mode === 'error') {
    return (
      <p className={styles.marketResearchStatus}>
        {message || '시장조사에 실패했습니다.'}
      </p>
    );
  }

  if (!report) {
    return null;
  }

  if (!report.dataFound) {
    return (
      <p className={styles.marketResearchStatus}>
        온라인 판매 정보를 찾지 못했습니다.
      </p>
    );
  }

  return (
    <div className={styles.marketResearchReport}>
      <p className={styles.marketResearchQuery}>{report.understoodQuery}</p>
      {report.clarificationNeeded ? (
        <p className={styles.marketResearchStatus}>
          {report.clarificationNeeded}
        </p>
      ) : null}
      {report.priceRange ? (
        <p className={styles.marketResearchPriceRange}>
          {formatKrw(report.priceRange.minKrw)} ~{' '}
          {formatKrw(report.priceRange.maxKrw)} ({report.priceRange.unit})
        </p>
      ) : null}
      {report.priceComparison ? (
        <div className={styles.priceComparison}>
          <h5 className={styles.priceComparisonTitle}>
            💰 가격 비교 — {report.priceComparison.dataProductName}
          </h5>
          <p className={styles.priceComparisonRow}>
            등록가 {formatKrw(report.priceComparison.dataPriceKrw)} · 시세{' '}
            {formatKrw(report.priceComparison.marketMinKrw)} ~{' '}
            {formatKrw(report.priceComparison.marketMaxKrw)}
            {report.priceComparison.differenceKrw !== null
              ? ` · 차액 ${report.priceComparison.differenceKrw >= 0 ? '+' : ''}${formatKrw(report.priceComparison.differenceKrw)}`
              : ''}
          </p>
          {report.priceComparison.note ? (
            <p className={styles.priceComparisonNote}>
              {report.priceComparison.note}
            </p>
          ) : null}
        </div>
      ) : null}
      {report.priceSources.length > 0 ? (
        <ul className={styles.marketResearchSources}>
          {report.priceSources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.site}
              </a>
              {source.priceKrw !== null
                ? ` — ${formatKrw(source.priceKrw)}`
                : ''}
            </li>
          ))}
        </ul>
      ) : null}
      {report.searchQueries.length > 0 ? (
        <div className={styles.marketResearchQueries}>
          <h5 className={styles.marketResearchQueriesTitle}>🔍 검색어</h5>
          <ul className={styles.marketResearchQueryList}>
            {report.searchQueries.map((query) => (
              <li key={query} className={styles.marketResearchQueryChip}>
                {query}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.newsArticles.length > 0 ? (
        <div className={styles.marketResearchNews}>
          <h5 className={styles.marketResearchNewsTitle}>📰 관련 뉴스</h5>
          <ul className={styles.marketResearchSources}>
            {report.newsArticles.map((article) => (
              <li key={article.url}>
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
                <p className={styles.marketResearchNewsSummary}>
                  {article.summary}
                </p>
                <span className={styles.marketResearchNewsMeta}>
                  {article.site}
                  {article.publishedDate ? ` · ${article.publishedDate}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
