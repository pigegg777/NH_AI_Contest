import { useEffect, useMemo, useState } from 'react';
import DataTable from '../../../common/components/DataTable';
import EmptyState from '../../../common/components/EmptyState';
import PageSection from '../../../common/components/PageSection';
import SearchInput from '../../../common/components/SearchInput';
import { buildPesticideInfoUrl } from '../../../common/utils/pesticideInfoUrl';
import { formatNongyakDisplayValue, NONGYAK_USAGE_COLUMNS } from '../model/nongyakCardFields';
import { useNongyakUsageQuery } from '../hooks/useNongyakUsageQuery';
import styles from './NongyakUsagePanel.module.css';

export default function NongyakUsagePanel({ tab, item }) {
  const { data, isLoading, isError } = useNongyakUsageQuery({
    tab,
    productCode: item?.product_code,
    enabled: Boolean(item),
  });
  const [cropQuery, setCropQuery] = useState('');
  const pesticideInfoUrl = buildPesticideInfoUrl({
    ...item,
    large_category: '농약',
  });

  useEffect(() => {
    setCropQuery('');
  }, [item?.product_code]);

  const filteredData = useMemo(() => {
    const trimmed = cropQuery.trim().toLowerCase();
    if (!trimmed) return data;
    return data.filter((row) => String(row?.cropName ?? '').toLowerCase().includes(trimmed));
  }, [data, cropQuery]);

  if (!item) {
    return (
      <PageSection title="작물별 사용법">
        <EmptyState message="카드를 선택하면 이 자리에 작물별 사용법이 표시됩니다." />
      </PageSection>
    );
  }

  return (
    <PageSection
      title="작물별 사용법"
      description={formatNongyakDisplayValue(item.product_name)}
      right={
        pesticideInfoUrl ? (
          <a
            href={pesticideInfoUrl}
            className={styles.detailLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            농약상세정보 바로가기
          </a>
        ) : null
      }
    >
      <dl className={styles.infoList}>
        <div className={styles.infoRow}>
          <dt className={styles.infoLabel}>표시기호</dt>
          <dd className={styles.infoValue}>{formatNongyakDisplayValue(item.indict_symbl)}</dd>
        </div>
        <div className={styles.infoRow}>
          <dt className={styles.infoLabel}>성분</dt>
          <dd className={styles.infoValue}>{formatNongyakDisplayValue(item.nutirent)}</dd>
        </div>
        <div className={styles.infoRow}>
          <dt className={styles.infoLabel}>용도</dt>
          <dd className={styles.infoValue}>{formatNongyakDisplayValue(item.product_category)}</dd>
        </div>
      </dl>

      {isLoading ? <p className={styles.status}>사용법을 불러오는 중입니다...</p> : null}
      {!isLoading && isError ? (
        <p className={styles.status}>사용법을 불러오지 못했습니다.</p>
      ) : null}
      {!isLoading && !isError && data.length > 0 ? (
        <SearchInput
          className={styles.cropSearch}
          value={cropQuery}
          onChange={setCropQuery}
          placeholder="작물명으로 검색 (예: 사과)"
          aria-label="작물별 사용법 내 작물 검색"
        />
      ) : null}
      {!isLoading && !isError ? (
        <DataTable
          columns={NONGYAK_USAGE_COLUMNS}
          rows={filteredData}
          emptyMessage={
            cropQuery.trim()
              ? '검색한 작물에 대한 사용법이 없습니다.'
              : '등록된 작물별 사용법 정보가 없습니다.'
          }
          compact
        />
      ) : null}
    </PageSection>
  );
}
