import { useMemo, useState } from 'react';

import FertilizerCardList from '../components/FertilizerCardList';
import { useFertilizerQuery } from '../hooks/useFertilizerQuery';
import {
  filterFertilizerItems,
  getFertilizerListViewModel,
} from '../utils/fertilizerSelectors';
import styles from './FertilizerInfoPage.module.css';

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
    return <main className={styles.page}><p className={styles.state}>비료 데이터를 불러오는 중…</p></main>;
  }

  if (error) {
    return (
      <main className={styles.page}>
        <p className={styles.state}>비료 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>
        <span className={styles.titleIconBadge} aria-hidden="true">
          N
        </span>
        <span className={styles.titleText}>발안농협 비료정보</span>
        <span className={styles.titleIconBadge} aria-hidden="true">
          P
        </span>
      </h1>

      <div className={styles.searchWrap}>
        <label className={styles.searchLabel} htmlFor="fertilizer-search">
          상품명 검색
        </label>
        <input
          id="fertilizer-search"
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="상품명, 비료 유형, 특징 검색…"
          aria-label="상품명 검색"
        />
      </div>

      <div className={styles.categoryWrap}>
        <CategoryTabs items={categoryItems} activeItem={category} onSelect={setCategory} />
      </div>

      <section className={styles.listSection}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>비료 카드 목록</h2>
          <span className={styles.listCount}>{filteredItems.length}개</span>
        </div>
        <FertilizerCardList items={filteredItems} />
      </section>
    </main>
  );
}
