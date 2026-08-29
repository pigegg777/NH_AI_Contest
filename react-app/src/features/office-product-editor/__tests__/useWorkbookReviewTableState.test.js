import { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkbookReviewTableState } from '../hooks/review-table/useWorkbookReviewTableState';
import { fetchStaticProductLookup } from '../services/staticProductLookupService';

vi.mock('../services/staticProductLookupService', () => ({
  fetchStaticProductLookup: vi.fn(),
}));

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
  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('static merge loading state', () => {
    it('finishes static merge loading when mounted in React Strict Mode', async () => {
      let resolveLookup;
      fetchStaticProductLookup.mockReturnValue(
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
      );

      const { result } = renderHook(
        () =>
          useWorkbookReviewTableState(sampleRows, 'fp-strict', {
            isStaticMergeEnabled: true,
            tableNameMode: 'fertilizer',
          }),
        { wrapper: StrictMode },
      );

      await waitFor(() => {
        expect(result.current.isStaticMergeLoading).toBe(true);
      });

      await act(async () => {
        resolveLookup({});
      });

      await waitFor(() => {
        expect(result.current.isStaticMergeLoading).toBe(false);
      });
    });

    it('clears static merge loading when there are no longer rows to look up', async () => {
      fetchStaticProductLookup.mockReturnValue(new Promise(() => {}));

      const { result, rerender } = renderHook(
        ({ rows }) =>
          useWorkbookReviewTableState(rows, 'fp-rows-cleared', {
            isStaticMergeEnabled: true,
            tableNameMode: 'fertilizer',
          }),
        { initialProps: { rows: sampleRows } },
      );

      await waitFor(() => {
        expect(result.current.isStaticMergeLoading).toBe(true);
      });

      rerender({ rows: [] });

      await waitFor(() => {
        expect(result.current.isStaticMergeLoading).toBe(false);
      });
    });

    it('reports isStaticMergeLoading true while the static lookup fetch is in flight, then false once it resolves', async () => {
      let resolveLookup;
      fetchStaticProductLookup.mockReturnValue(
        new Promise((resolve) => {
          resolveLookup = resolve;
        }),
      );

      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'fp-fert', {
          hasResult: true,
          isStaticMergeEnabled: true,
          tableNameMode: 'fertilizer',
        }),
      );

      await act(async () => {});

      expect(result.current.isStaticMergeLoading).toBe(true);

      await act(async () => {
        resolveLookup({});
      });

      await waitFor(() => {
        expect(result.current.isStaticMergeLoading).toBe(false);
      });
    });

    it('still applies the static lookup to rows once it resolves, even though annotations hydration fires its own effect on mount', async () => {
      fetchStaticProductLookup.mockResolvedValue({
        A100: {
          product_code: 'A100',
          img_url: 'https://example.com/a100.png',
          product_url: 'https://example.com/a100',
          nutrient: 'N-P-K',
          price_subsidy: 1200,
        },
      });

      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'fp-fert-2', {
          hasResult: true,
          isStaticMergeEnabled: true,
          tableNameMode: 'fertilizer',
        }),
      );

      await waitFor(() => {
        expect(result.current.isStaticMergeLoading).toBe(false);
      });

      const row = result.current.rows.find((r) => r.row_id === 'A100__01');
      expect(row.img_url).toBe('https://example.com/a100.png');
      expect(row.nutrient).toBe('N-P-K');
      expect(row.price_subsidy).toBe(1200);
    });

    it('is not loading when static merge is disabled for this table mode', async () => {
      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'fp-custom', {
          hasResult: true,
          isStaticMergeEnabled: false,
          tableNameMode: 'custom',
        }),
      );

      await act(async () => {});

      expect(result.current.isStaticMergeLoading).toBe(false);
      expect(fetchStaticProductLookup).not.toHaveBeenCalled();
    });

    it('merges static fertilizer data when an AI row is appended to an empty category', async () => {
      fetchStaticProductLookup.mockResolvedValue({
        F900: {
          product_code: 'F900',
          img_url: 'https://example.com/f900.png',
          product_url: 'https://example.com/f900',
          nutrient: '21-17-17',
          price_subsidy: 1500,
        },
      });

      const { result } = renderHook(() =>
        useWorkbookReviewTableState([], null, {
          hasResult: false,
          isStaticMergeEnabled: true,
          tableNameMode: 'fertilizer',
        }),
      );

      await act(async () => {});
      act(() => {
        result.current.appendRows([
          {
            row_id: 'F900__01',
            product_code: 'F900',
            product_name: 'AI 신규 비료',
            warnings: [],
          },
        ]);
      });

      await waitFor(() => {
        expect(result.current.rows[0]?.nutrient).toBe('21-17-17');
      });
      expect(result.current.rows[0]).toMatchObject({
        img_url: 'https://example.com/f900.png',
        product_url: 'https://example.com/f900',
        price_subsidy: 1500,
      });
    });

    it('merges static pesticide data when an AI row is appended to an empty category', async () => {
      fetchStaticProductLookup.mockResolvedValue({
        P900: {
          product_code: 'P900',
          nutirent: '살충제',
          product_category: '농약',
          product_usage: ['진딧물'],
          indict_symbl: '접촉독',
        },
      });

      const { result } = renderHook(() =>
        useWorkbookReviewTableState([], null, {
          hasResult: false,
          isStaticMergeEnabled: true,
          tableNameMode: 'pesticide',
        }),
      );

      await act(async () => {});
      act(() => {
        result.current.appendRows([
          {
            row_id: 'P900__01',
            product_code: 'P900',
            product_name: 'AI 신규 농약',
            warnings: [],
          },
        ]);
      });

      await waitFor(() => {
        expect(result.current.rows[0]?.product_category).toBe('농약');
      });
      expect(result.current.rows[0]).toMatchObject({
        nutirent: '살충제',
        product_usage: ['진딧물'],
        indict_symbl: '접촉독',
      });
    });
  });

  describe('annotations', () => {
    it('preserves saved note and shadow values from loaded rows before any local edit', () => {
      const savedRows = [
        {
          ...sampleRows[0],
          shadow: true,
          note: 'saved note',
        },
      ];

      const { result } = renderHook(() =>
        useWorkbookReviewTableState(savedRows, 'fp-saved'),
      );

      expect(result.current.rows[0].shadow).toBe(true);
      expect(result.current.rows[0].note).toBe('saved note');
    });

    it('preserves a previously-saved img_url from loaded rows before any local edit', () => {
      const savedRows = [
        {
          ...sampleRows[0],
          img_url: 'https://example.com/existing.png',
        },
      ];

      const { result } = renderHook(() =>
        useWorkbookReviewTableState(savedRows, 'fp-saved-img'),
      );

      expect(result.current.rows[0].img_url).toBe('https://example.com/existing.png');
    });

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

    it('toggles shadow from the currently loaded row value', async () => {
      const savedRows = [
        {
          ...sampleRows[0],
          shadow: true,
          note: 'saved note',
        },
      ];
      const { result } = renderHook(() =>
        useWorkbookReviewTableState(savedRows, 'fp-shadow'),
      );

      await act(async () => {
        result.current.toggleShadow('A100__01');
      });

      expect(result.current.rows[0].shadow).toBe(false);
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

    it('resets search/filters/sort when the fingerprint changes to a different category', async () => {
      const { result, rerender } = renderHook(
        ({ fingerprint }) => useWorkbookReviewTableState(sampleRows, fingerprint),
        { initialProps: { fingerprint: 'fp-1' } },
      );

      await act(async () => {
        result.current.setSearchQuery('Alpha');
      });
      await act(async () => {
        result.current.handleFilterChange('medium_category', '복합');
      });
      await act(async () => {
        result.current.setSortState({ key: 'product_code', direction: 'desc' });
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['A100__01']);

      rerender({ fingerprint: 'fp-2' });

      await act(async () => {});

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filters.medium_category).toBe('');
      expect(result.current.sortState).toEqual({ key: 'product_code', direction: 'asc' });
      expect(result.current.rows.map((row) => row.row_id)).toEqual(['A100__01', 'B200__02']);
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

    it('applies an AI-generated/uploaded img_url override to rows, ready to be saved', async () => {
      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'fp-1'),
      );

      await act(async () => {
        result.current.updateImgUrl('A100__01', 'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/x.png');
      });

      const row = result.current.rows.find((r) => r.row_id === 'A100__01');
      expect(row.img_url).toBe(
        'https://example.supabase.co/storage/v1/object/public/product-images/OFF-1/x.png',
      );
      // untouched rows must not pick up the override
      const otherRow = result.current.rows.find((r) => r.row_id === 'B200__02');
      expect(otherRow.img_url).toBeUndefined();
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
