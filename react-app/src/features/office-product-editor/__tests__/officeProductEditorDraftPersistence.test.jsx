import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchOfficeProductDataCatalog = vi.fn();
const fetchOfficeProductData = vi.fn();
const fetchStaticProductLookup = vi.fn();

vi.mock('../services/office-product-data/officeProductDataReadService', () => ({
  fetchOfficeProductDataCatalog: (...args) => fetchOfficeProductDataCatalog(...args),
  fetchOfficeProductData: (...args) => fetchOfficeProductData(...args),
}));

vi.mock('../services/staticProductLookupService', () => ({
  fetchStaticProductLookup: (...args) => fetchStaticProductLookup(...args),
}));

import OfficeProductEditorPage from '../pages/OfficeProductEditorPage';

const USER = { id: 7, office_code: 'OFF-1', office_name: '본점' };
const DRAFT_STORAGE_KEY = 'office-product-editor:draft:OFF-1';
const SAMPLE_ROWS = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha',
    sale_price_type_code: '01',
    sale_price_type_name: '기본',
    tax_price: 1000,
    zero_tax_price: 900,
    large_category: '비료',
    medium_category: '복합',
    small_category: '일반',
    detail_category: null,
    spec: '20kg',
    manufacturer_list: null,
    shadow: false,
    note: '',
  },
];

function buildSelectionDraft(overrides = {}) {
  return {
    tableNameMode: 'fertilizer',
    customTableName: '',
    pendingCustomCategories: [],
    activeCustomCategoryName: '',
    ...overrides,
  };
}

function buildExtractionDraft(overrides = {}) {
  return {
    selectedFileName: 'demo.xlsx',
    workbookFingerprint: 'draft-fingerprint',
    result: {
      sheetName: 'Sheet1',
      warnings: [],
      rows: SAMPLE_ROWS,
    },
    ...overrides,
  };
}

function writeDraft(draft) {
  globalThis.sessionStorage.setItem(
    DRAFT_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      ...draft,
    }),
  );
}

describe('OfficeProductEditor draft persistence', () => {
  beforeEach(() => {
    globalThis.sessionStorage.clear();
    fetchOfficeProductDataCatalog.mockResolvedValue([]);
    fetchOfficeProductData.mockResolvedValue(null);
    fetchStaticProductLookup.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('restores the in-progress extracted workbook workspace from sessionStorage on mount', async () => {
    writeDraft({
      selection: buildSelectionDraft(),
      extraction: buildExtractionDraft(),
    });

    render(<OfficeProductEditorPage user={USER} />);

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장하기' })).toBeEnabled();
    expect(fetchOfficeProductData).not.toHaveBeenCalled();
  });

  it('restores the selected registered category and reloads its saved rows on mount', async () => {
    fetchOfficeProductDataCatalog.mockResolvedValue([
      {
        id: 1,
        officeCode: 'OFF-1',
        officeName: '본점',
        categoryName: '비료',
        rowCount: 1,
        sourceFileName: 'fertilizer.xlsx',
        updatedAt: '2026-06-07T00:00:00Z',
      },
    ]);
    fetchOfficeProductData.mockResolvedValue({
      rows: SAMPLE_ROWS,
      sourceFileName: 'fertilizer.xlsx',
      updatedAt: '2026-06-07T00:00:00Z',
      rowCount: 1,
    });
    writeDraft({
      selection: buildSelectionDraft(),
      extraction: buildExtractionDraft({
        selectedFileName: '',
        workbookFingerprint: null,
        result: null,
      }),
    });

    render(<OfficeProductEditorPage user={USER} />);

    await waitFor(() => {
      expect(fetchOfficeProductData).toHaveBeenCalledWith({
        officeCode: 'OFF-1',
        categoryName: '비료',
      });
    });
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
  });

  it('restores AI recommendations and the market research report on mount without re-running either', async () => {
    writeDraft({
      selection: buildSelectionDraft(),
      extraction: buildExtractionDraft(),
    });
    globalThis.sessionStorage.setItem(
      'office-product-editor:ai-recommendations:draft-fingerprint',
      JSON.stringify({
        version: 1,
        recommendations: [
          {
            id: 'rec-1',
            title: '가격 확인 필요',
            reason: '동일 상품 가격 상이',
            relatedRowIds: ['A100__01'],
          },
        ],
        analysisMode: 'openai',
        analysisMessage: '',
        activeRecommendationId: null,
      }),
    );
    globalThis.sessionStorage.setItem(
      'office-product-editor:market-research:OFF-1',
      JSON.stringify({
        version: 1,
        activeQuery: '사과 부사 5kg',
        mode: 'openai',
        report: {
          understoodQuery: '사과 부사 5kg 온라인 판매가 조사',
          clarificationNeeded: null,
          dataFound: true,
          priceRange: { minKrw: 13800, maxKrw: 29900, unit: 'KRW per 5kg box' },
          priceSources: [],
        },
        message: '',
      }),
    );

    render(<OfficeProductEditorPage user={USER} />);

    await screen.findByText('Alpha');
    fireEvent.click(screen.getByRole('tab', { name: 'AI 분석' }));

    expect(await screen.findByText('가격 확인 필요')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '시장조사' }));
    expect(screen.getByText('사과 부사 5kg 온라인 판매가 조사')).toBeInTheDocument();
  });
});
