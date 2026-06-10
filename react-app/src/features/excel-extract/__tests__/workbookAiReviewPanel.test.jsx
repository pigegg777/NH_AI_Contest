import { useMemo, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AiRecommendationPanel } from '../components/AiRecommendationPanel';
import { ResultTableSection } from '../components/ResultTableSection';
import { createInitialFilters, createInitialSortState } from '../model/table';

const rows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: '알파비료',
    nutrient: 'N-P-K',
    price_subsidy: 100,
    img_url: null,
    product_url: null,
    sale_price_type_code: '01',
    sale_price_type_name: '기본',
    large_category: '비료',
    medium_category: '복합',
    small_category: '일반',
    detail_category: null,
    tax_price: 1000,
    zero_tax_price: 1200,
    spec: '20kg',
    manufacturer_list: null,
    shadow: false,
    note: '',
  },
  {
    row_id: 'B200__01',
    product_code: 'B200',
    product_name: '베타비료',
    nutrient: 'P-K',
    price_subsidy: 90,
    img_url: null,
    product_url: null,
    sale_price_type_code: '01',
    sale_price_type_name: '기본',
    large_category: '비료',
    medium_category: '복합',
    small_category: '일반',
    detail_category: null,
    tax_price: 900,
    zero_tax_price: 800,
    spec: '20kg',
    manufacturer_list: null,
    shadow: false,
    note: '',
  },
];

const recommendations = [
  {
    id: 'rec-1',
    severity: 'high',
    title: '영세단가가 과세단가보다 높습니다',
    reason: '행 검토 필요',
    relatedRowIds: ['A100__01'],
  },
];

function Harness() {
  const [activeRecommendationId, setActiveRecommendationId] = useState(null);
  const highlightedRowIds = useMemo(() => {
    const activeRecommendation = recommendations.find(
      (recommendation) => recommendation.id === activeRecommendationId,
    );

    return activeRecommendation?.relatedRowIds ?? [];
  }, [activeRecommendationId]);

  return (
    <>
      <AiRecommendationPanel
        recommendations={recommendations}
        analysisMode="mock"
        activeRecommendationId={activeRecommendationId}
        isAnalyzing={false}
        errorMessage=""
        onRecommendationSelect={setActiveRecommendationId}
      />
      <ResultTableSection
        rows={rows}
        searchQuery=""
        onSearchQueryChange={vi.fn()}
        filters={createInitialFilters()}
        filterOptions={{
          sale_price_type_name: [],
          large_category: [],
          medium_category: [],
          small_category: [],
          detail_category: [],
        }}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
        sortState={createInitialSortState()}
        onSortChange={vi.fn()}
        onShadowToggle={vi.fn()}
        onVisibleRowsShadowChange={vi.fn()}
        onNoteChange={vi.fn()}
        highlightedRowIds={highlightedRowIds}
      />
    </>
  );
}

describe('workbook AI review panel', () => {
  it('highlights related rows when a recommendation card is clicked', async () => {
    const user = userEvent.setup();

    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /영세단가가 과세단가보다 높습니다/i }));

    expect(screen.getByTestId('row-A100__01')).toHaveClass(/rowHighlighted/);
  });
});

