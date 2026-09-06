import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CategoryTabs from '../components/builder-workspace/category-tabs/CategoryTabs';

function renderTabs(categoryTabs) {
  render(
    <CategoryTabs
      categoryTabsMode={{
        categoryTabs,
        selectedCategoryId: 'common',
        selectCategory: vi.fn(),
      }}
    />,
  );

  return screen.getAllByRole('tab').map((tab) => tab.textContent);
}

describe('CategoryTabs 칩 순서', () => {
  it('공통 요소 · 비료 · 농약 · 그 외 순으로 세운다', () => {
    const labels = renderTabs([
      { id: '상토', label: '상토' },
      { id: '농약', label: '농약' },
      { id: 'common', label: '공통 요소' },
      { id: '비료', label: '비료' },
    ]);

    expect(labels).toEqual(['공통 요소', '비료', '농약', '상토']);
  });

  it('그 외 분류는 가나다순으로 붙인다', () => {
    const labels = renderTabs([
      { id: '포장재', label: '포장재' },
      { id: '자재', label: '자재' },
      { id: 'common', label: '공통 요소' },
      { id: '상토', label: '상토' },
      { id: '농약', label: '농약' },
    ]);

    expect(labels).toEqual(['공통 요소', '농약', '상토', '자재', '포장재']);
  });

  it('비료나 농약이 없어도 나머지 순서를 지킨다', () => {
    const labels = renderTabs([
      { id: '자재', label: '자재' },
      { id: 'common', label: '공통 요소' },
      { id: '상토', label: '상토' },
    ]);

    expect(labels).toEqual(['공통 요소', '상토', '자재']);
  });
});
