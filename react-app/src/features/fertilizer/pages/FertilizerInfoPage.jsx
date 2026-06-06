import { useMemo, useState } from 'react';

import FertilizerCardList from '../components/FertilizerCardList';
import { useFertilizerQuery } from '../hooks/useFertilizerQuery';
import {
  filterFertilizerItems,
  getFertilizerListViewModel,
} from '../utils/fertilizerSelectors';
import styles from './FertilizerInfoPage.module.css';

function SearchIcon() {
  return (
    <svg
      className={styles.searchIcon}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M14.5 14.5L18 18" strokeLinecap="round" />
    </svg>
  );
}

function CategoryTabs({ items, activeItem, onSelect }) {
  return (
    <div className={styles.categoryList} role="tablist" aria-label="비료 유형">
      {items.map((item) => {
        const isActive = item === activeItem;
        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.categoryItem} ${isActive ? styles.categoryItemActive : ''}`.trim()}
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

export default function FertilizerInfoPage() {
  const { data = [], isLoading, error } = useFertilizerQuery();
  const { items, categories } = useMemo(
    () => (isLoading || error ? { items: [], categories: [] } : getFertilizerListViewModel(data)),
    [data, error, isLoading],
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const categoryItems = ['전체', ...categories];

  const filteredItems = useMemo(
    () => filterFertilizerItems(items, category, query),
    [category, items, query],
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        <p className={styles.state}>비료 데이터를 불러오는 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <p className={styles.state}>데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.pageTitle}>비료 정보</h1>
        <p className={styles.pageSubtitle}>비료 종류·가격·지원 정보를 검색하고 비교하세요</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchIcon />
          <input
            id="fertilizer-search"
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="상품명, 비료 유형, 특징 검색…"
            aria-label="비료 검색"
          />
        </div>
        <CategoryTabs items={categoryItems} activeItem={category} onSelect={setCategory} />
      </div>

      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>비료 목록</h2>
        <span className={styles.listCount}>{filteredItems.length}건</span>
      </div>

      <div className={styles.listWrap}>
        <FertilizerCardList items={filteredItems} />
      </div>
    </div>
  );
}
