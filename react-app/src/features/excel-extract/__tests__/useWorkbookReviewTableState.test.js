import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorkbookReviewStorageKey } from '../model/annotations/annotationModel';
import { SORT_DIRECTION } from '../model/table';
import { useWorkbookReviewTableState } from '../hooks/useWorkbookReviewTableState';
import { fetchStaticFertilizerLookup } from '../services/staticFertilizerLookupService';

vi.mock('../services/staticFertilizerLookupService', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    fetchStaticFertilizerLookup: vi.fn(),
  };
});

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
    manufacturer_list: [{ manufacturer_code: 'M01', manufacturer_name: 'NH' }],
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

afterEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('useWorkbookReviewTableState', () => {
  describe('annotations', () => {
    it('hydrates saved annotations and persists updates back to sessionStorage', () => {
      const storageKey = createWorkbookReviewStorageKey('workbook-a');
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ A100__01: { shadow: true, note: 'saved note' } }),
      );

      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'workbook-a', { isStaticMergeEnabled: true }),
      );

      expect(result.current.mergedRows[0]).toEqual(
        expect.objectContaining({ row_id: 'A100__01', shadow: true, note: 'saved note' }),
      );

      act(() => {
        result.current.toggleShadow('B200__02');
        result.current.updateNote('B200__02', 'new memo');
        result.current.setShadowForRows(['A100__01', 'B200__02'], true);
      });

      expect(JSON.parse(sessionStorage.getItem(storageKey))).toEqual(
        expect.objectContaining({
          A100__01: { shadow: true, note: 'saved note' },
          B200__02: { shadow: true, note: 'new memo' },
        }),
      );
    });

    it('keeps annotations isolated across workbook fingerprint changes', () => {
      sessionStorage.setItem(
        createWorkbookReviewStorageKey('workbook-a'),
        JSON.stringify({ A100__01: { shadow: true, note: 'only a' } }),
      );

      const { result, rerender } = renderHook(
        ({ rows, fingerprint }) => useWorkbookReviewTableState(rows, fingerprint),
        { initialProps: { rows: sampleRows, fingerprint: 'workbook-a' } },
      );

      expect(result.current.mergedRows[0].shadow).toBe(true);

      rerender({ rows: sampleRows, fingerprint: 'workbook-b' });

      expect(result.current.mergedRows[0].shadow).toBe(false);
      expect(result.current.mergedRows[0].note).toBe('');
    });

    it('returns a stable empty row set without entering a render loop', () => {
      const { result, rerender } = renderHook(
        ({ fingerprint }) => useWorkbookReviewTableState([], fingerprint),
        { initialProps: { fingerprint: null } },
      );

      expect(result.current.mergedRows).toEqual([]);

      rerender({ fingerprint: 'workbook-a' });

      expect(result.current.mergedRows).toEqual([]);
    });
  });

  describe('static fertilizer merge', () => {
    it('merges static fertilizer fields into the annotated rows only after handleStaticDataMerge resolves', async () => {
      fetchStaticFertilizerLookup.mockResolvedValue({
        A100: {
          product_code: 'A100',
          img_url: 'https://example.com/a100.png',
          product_url: 'https://example.com/a100',
          nutrient: 'N-P-K',
          price_subsidy: 1200,
        },
      });

      const { result } = renderHook(() =>
        useWorkbookReviewTableState(sampleRows, 'workbook-a', { isStaticMergeEnabled: true }),
      );

      expect(result.current.mergedRows[0].img_url).toBeUndefined();
      expect(result.current.mergeSummary).toBe(null);
      expect(result.current.mergeStatusMessage).toBe('');

      await act(async () => {
        await result.current.handleStaticDataMerge();
      });

      expect(fetchStaticFertilizerLookup).toHaveBeenCalledWith(['A100', 'B200']);
      expect(result.current.mergeSummary).toEqual({ requested: 2, matched: 1 });
      expect(result.current.mergeStatusMessage).toBe('병합 완료 1/2');
      expect(result.current.mergedRows[0]).toEqual(
        expect.objectContaining({
          product_code: 'A100',
          img_url: 'https://example.com/a100.png',
          nutrient: 'N-P-K',
          price_subsidy: 1200,
        }),
      );
    });

    it('resets merge state when the workbook fingerprint changes', async () => {
      fetchStaticFertilizerLookup.mockResolvedValue({
        A100: {
          product_code: 'A100',
          img_url: 'https://example.com/a100.png',
          product_url: null,
          nutrient: null,
          price_subsidy: null,
        },
      });

      const { result, rerender } = renderHook(
        ({ workbookFingerprint, isStaticMergeEnabled }) =>
          useWorkbookReviewTableState(sampleRows, workbookFingerprint, { isStaticMergeEnabled }),
        { initialProps: { workbookFingerprint: 'workbook-a', isStaticMergeEnabled: true } },
      );

      await act(async () => {
        await result.current.handleStaticDataMerge();
      });

      expect(result.current.isMerged).toBe(true);

      rerender({ workbookFingerprint: 'workbook-b', isStaticMergeEnabled: true });

      expect(result.current.isMerged).toBe(false);
      expect(result.current.mergeSummary).toBe(null);
      expect(result.current.mergeStatusMessage).toBe('');
      expect(result.current.mergedRows[0].img_url).toBeUndefined();
    });

    it('returns annotated rows when static merge is disabled after a merge has completed', async () => {
      fetchStaticFertilizerLookup.mockResolvedValue({
        A100: {
          product_code: 'A100',
          img_url: 'https://example.com/a100.png',
          product_url: 'https://example.com/a100',
          nutrient: 'N-P-K',
          price_subsidy: 1200,
        },
      });

      const { result, rerender } = renderHook(
        ({ isStaticMergeEnabled }) =>
          useWorkbookReviewTableState(sampleRows, 'workbook-a', { isStaticMergeEnabled }),
        { initialProps: { isStaticMergeEnabled: true } },
      );

      await act(async () => {
        await result.current.handleStaticDataMerge();
      });

      expect(result.current.mergedRows[0].img_url).toBe('https://example.com/a100.png');
      expect(result.current.mergeStatusMessage).toBe('병합 완료 1/2');

      rerender({ isStaticMergeEnabled: false });

      expect(result.current.mergedRows[0].img_url).toBeUndefined();
      expect(result.current.mergeStatusMessage).toBe('');
    });
  });

  describe('table model', () => {
    it('derives display rows, warning rows and filter options from the merged set, and supports search/filter/sort', async () => {
      const { result } = renderHook(() => useWorkbookReviewTableState(sampleRows, 'workbook-a'));

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['A100__01', 'B200__02']);
      expect(result.current.warningRows.map((row) => row.row_id)).toEqual(['B200__02']);
      expect(result.current.filterOptions.large_category).toEqual(['농약', '비료']);

      await act(async () => {
        result.current.setSearchQuery('Beta');
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['B200__02']);

      await act(async () => {
        result.current.resetFilters();
      });
      await act(async () => {
        result.current.handleFilterChange('large_category', '비료');
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['A100__01']);

      await act(async () => {
        result.current.resetFilters();
      });
      await act(async () => {
        result.current.setSortState({ key: 'product_code', direction: SORT_DIRECTION.descending });
      });

      expect(result.current.rows.map((row) => row.row_id)).toEqual(['B200__02', 'A100__01']);
    });
  });
});

