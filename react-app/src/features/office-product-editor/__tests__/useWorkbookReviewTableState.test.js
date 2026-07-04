import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useWorkbookReviewTableState } from '../hooks/review-table/useWorkbookReviewTableState';

const sampleRows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha Fertilizer',
    sale_price_type_code: '01',
    sale_price_type_name: '기본',
    large_category: '비료',
    medium_category: '복합',
    small_category: '일반',
    detail_category: null,
    spec: '20kg',
    nutrient: 'N-P-K',
    tax_price: 1000,
    zero_tax_price: 900,
    manufacturer_list: [{ manufacturer_name: 'NH' }],
    warnings: [],
  },
  {
    row_id: 'B200__02',
    product_code: 'B200',
    product_name: 'Beta Pesticide',
    sale_price_type_code: '02',
    sale_price_type_name: '회원',
    large_category: '농약',
    medium_category: '살충제',
    small_category: '일반',
    detail_category: null,
    spec: '1L',
    nutrient: null,
    tax_price: 980,
    zero_tax_price: 1100,
    manufacturer_list: null,
    warnings: ['세전가가 세후가보다 낮습니다'],
  },
];

describe('useWorkbookReviewTableState', () => {
  describe('annotations', () => {
    it('applies shadow and note to rows', async () => {
      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'fp-1'),
      );

      await act(async () => {
        result.current.toggleShadow('A100__01');
      });
      await act(async () => {
        result.current.updateNote('A100__01', 'test note');
      });

      const row = result.current.rows.find((r) => r.row_id === 'A100__01');
      expect(row.shadow).toBe(true);
      expect(row.note).toBe('test note');
    });

    it('resets annotations when fingerprint changes', async () => {
      const { result, rerender } = renderHook(
        ({ fingerprint }) => useWorkbookReviewTableState(sampleRows, fingerprint),
        { initialProps: { fingerprint: 'fp-1' } },
      );

      await act(async () => {
        result.current.toggleShadow('A100__01');
      });

      expect(result.current.rows.find((r) => r.row_id === 'A100__01').shadow).toBe(true);

      rerender({ fingerprint: 'fp-2' });

      await act(async () => {});

      expect(result.current.rows.find((r) => r.row_id === 'A100__01').shadow).toBe(false);
    });

    it('applies price override to rows', async () => {
      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'fp-1'),
      );

      await act(async () => {
        result.current.updatePrice('A100__01', 'tax_price', 9999);
      });

      const row = result.current.rows.find((r) => r.row_id === 'A100__01');
      expect(row.tax_price).toBe(9999);
    });

    it('returns a stable empty row set when no rows provided', () => {
      const { result } = renderHook(() => useWorkbookReviewTableState([], 'fp-1'));
      expect(result.current.rows).toEqual([]);
      expect(result.current.annotatedRows).toEqual([]);
    });
  });

  describe('table model', () => {
    it('derives display rows, warning rows and filter options from the extracted set, and supports search/filter/sort', async () => {
      const { result } = renderHook(() => useWorkbookReviewTableState(sampleRows));

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['A100__01', 'B200__02']);
      expect(result.current.warningRows.map((row) => row.row_id)).toEqual(['B200__02']);
      expect(result.current.filterOptions.medium_category).toEqual(['복합', '살충제']);

      await act(async () => {
        result.current.setSearchQuery('Beta');
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['B200__02']);

      await act(async () => {
        result.current.resetFilters();
      });
      await act(async () => {
        result.current.handleFilterChange('medium_category', '복합');
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['A100__01']);

      await act(async () => {
        result.current.resetFilters();
      });
      await act(async () => {
        result.current.setSortState({ key: 'product_code', direction: 'desc' });
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['B200__02', 'A100__01']);
    });
  });
});
