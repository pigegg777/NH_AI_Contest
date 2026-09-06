import { useMemo, useRef, useState } from 'react';
import pesticideIconUrl from '../../../common/assets/nongyak/pesticide-icon.png';
import EmptyState from '../../../common/components/EmptyState';
import PageDataState from '../../../common/components/PageDataState';
import useObservedElementHeight from '../../../common/hooks/useObservedElementHeight';
import NongyakCardGrid from '../components/NongyakCardGrid';
import NongyakSuggestField from '../components/NongyakSuggestField';
import NongyakUsagePanel from '../components/NongyakUsagePanel';
import { useNongyakSearchQuery } from '../hooks/useNongyakSearchQuery';
import { buildCategoryOptions, NONGYAK_ALL_CATEGORY } from '../model/nongyakCardFields';
import styles from './NongyakPage.module.css';

const TABS = [
  { value: 'inventory', label: '재고상품' },
  { value: 'catalog', label: '전체상품' },
];

const SEARCH_FIELDS = [
  { key: 'crop', id: 'nongyak-search-crop', label: '작물', placeholder: '예: 사과, 고추' },
  {
    key: 'productName',
    id: 'nongyak-search-product-name',
    label: '상품명',
    placeholder: '예: 부란카트',
  },
  {
    key: 'indictSymbl',
    id: 'nongyak-search-indict-symbl',
    label: '작용기작',
    placeholder: '예: 아4, 3a',
  },
  { key: 'nutirent', id: 'nongyak-search-nutirent', label: '성분', placeholder: '예: 폴리옥신' },
  {
    key: 'diseaseWeed',
    id: 'nongyak-search-disease-weed',
    label: '병해충/잡초',
    placeholder: '예: 노균병, 진딧물',
  },
];

function createEmptyFilters() {
  return { crop: '', productName: '', indictSymbl: '', nutirent: '', diseaseWeed: '' };
}

// AppLayout의 상단 네비게이션(sticky) 높이(56px + 하단 경계선 1px).
// 사이드바 sticky offset 계산에 필요.
const APP_HEADER_HEIGHT = 57;
const STICKY_GAP = 16;

export default function NongyakPage({ officeCode = '' }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [filters, setFilters] = useState(createEmptyFilters);
  const [category, setCategory] = useState(NONGYAK_ALL_CATEGORY);
  const [selectedItem, setSelectedItem] = useState(null);
  const stickyHeaderRef = useRef(null);
  const stickyHeaderHeight = useObservedElementHeight(stickyHeaderRef);
  const sidebarTop = APP_HEADER_HEIGHT + (stickyHeaderHeight ?? 0) + STICKY_GAP;

  const { data: items, isLoading, isError, error } = useNongyakSearchQuery({
    tab: activeTab,
    officeCode,
    ...filters,
    category,
  });

  const categoryOptions = useMemo(() => buildCategoryOptions(items), [items]);

  const handleFieldChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroIconBadge} aria-hidden="true">
          <img src={pesticideIconUrl} alt="" className={styles.heroIcon} />
        </span>
        <div>
          <h1 className={styles.title}>농약 검색</h1>
          <p className={styles.subtitle}>
            재고상품과 전체 등록상품에서 작물, 상품명, 작용기작, 성분, 병해충/잡초로 찾아보세요.
          </p>
        </div>
      </header>

      <div className={styles.stickyHeader} ref={stickyHeaderRef}>
        <div className={styles.tabRow} role="tablist" aria-label="상품 범위 탭">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              className={[styles.tab, activeTab === tab.value ? styles.tabActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.filterPanel}>
          <div className={styles.searchGrid}>
            {SEARCH_FIELDS.map((field) => (
              <div key={field.key} className={styles.searchField}>
                <label className={styles.searchLabel} htmlFor={field.id}>
                  {field.label}
                </label>
                <NongyakSuggestField
                  id={field.id}
                  className={styles.searchInput}
                  tab={activeTab}
                  officeCode={officeCode}
                  field={field.key}
                  value={filters[field.key]}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  placeholder={field.placeholder}
                  aria-label={`${field.label}으로 검색`}
                />
              </div>
            ))}

            <div className={styles.searchField}>
              <label className={styles.searchLabel} htmlFor="nongyak-category-select">
                카테고리
              </label>
              <select
                id="nongyak-category-select"
                className={styles.categorySelect}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="카테고리로 필터"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.layout} style={{ '--nongyak-sidebar-top': `${sidebarTop}px` }}>
        <div className={styles.main}>
          <div className={styles.resultMeta}>
            <span className={styles.resultCount}>{items.length.toLocaleString('ko-KR')}</span>
            건
          </div>

          {isLoading ? <PageDataState message="농약 정보를 불러오는 중..." /> : null}
          {!isLoading && isError ? (
            <PageDataState
              mode="error"
              message={error?.message || '검색 중 오류가 발생했습니다.'}
            />
          ) : null}
          {!isLoading && !isError && !items.length ? (
            <EmptyState message="조건에 맞는 상품이 없습니다." />
          ) : null}
          {!isLoading && !isError && items.length ? (
            <NongyakCardGrid
              tab={activeTab}
              items={items}
              selectedProductCode={selectedItem?.product_code}
              onSelectItem={setSelectedItem}
            />
          ) : null}
        </div>

        <aside className={styles.sidebar}>
          <NongyakUsagePanel tab={activeTab} item={selectedItem} />
        </aside>
      </div>
    </div>
  );
}
