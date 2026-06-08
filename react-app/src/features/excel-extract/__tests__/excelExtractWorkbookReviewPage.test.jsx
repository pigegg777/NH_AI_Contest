import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockResult = null;
let mockCatalogState = {
  items: [],
  isLoading: false,
  errorMessage: '',
};
const handleWorkbookChange = vi.fn();
const saveOfficeProductData = vi.fn();

vi.mock('../hooks/workbook-review/useWorkbookExtraction', () => ({
  useWorkbookExtraction: () => ({
    selectedFileName: 'demo.xlsx',
    workbookFingerprint: 'workbook-fingerprint',
    isExtracting: false,
    errorMessage: '',
    result: mockResult,
    handleWorkbookChange,
  }),
}));

vi.mock('../services/officeProductDataService', () => ({
  saveOfficeProductData: (...args) => saveOfficeProductData(...args),
}));

vi.mock('../hooks/workbook-review/useOfficeProductDataCatalog', () => ({
  useOfficeProductDataCatalog: () => mockCatalogState,
}));

import ExcelExtractWorkbookReviewPage from '../pages/ExcelExtractWorkbookReviewPage';

const sampleRows = [
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

describe('ExcelExtractWorkbookReviewPage', () => {
  beforeEach(() => {
    mockResult = null;
    mockCatalogState = {
      items: [],
      isLoading: false,
      errorMessage: '',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the custom input only when custom is selected', async () => {
    const user = userEvent.setup();

    render(<ExcelExtractWorkbookReviewPage />);

    const select = screen.getByLabelText('테이블 이름');

    expect(select).toBeInTheDocument();
    expect(screen.queryByLabelText('직접 입력')).not.toBeInTheDocument();

    await user.selectOptions(select, 'fertilizer');
    expect(screen.queryByLabelText('직접 입력')).not.toBeInTheDocument();

    await user.selectOptions(select, 'pesticide');
    expect(screen.queryByLabelText('직접 입력')).not.toBeInTheDocument();

    await user.selectOptions(select, 'custom');
    expect(screen.getByLabelText('직접 입력')).toBeInTheDocument();
  });

  it('preserves custom input text when switching away and back', async () => {
    const user = userEvent.setup();

    render(<ExcelExtractWorkbookReviewPage />);

    const select = screen.getByLabelText('테이블 이름');

    await user.selectOptions(select, 'custom');
    await user.type(screen.getByLabelText('직접 입력'), '자재');
    await user.selectOptions(select, 'fertilizer');
    await user.selectOptions(select, 'custom');

    expect(screen.getByLabelText('직접 입력')).toHaveValue('자재');
  });

  it('saves with the custom category name', async () => {
    const user = userEvent.setup();

    mockResult = { warnings: [], rows: sampleRows };
    saveOfficeProductData.mockResolvedValue({
      id: 1,
      row_count: 1,
      updated_at: '2026-06-07T00:00:00Z',
    });

    render(
      <ExcelExtractWorkbookReviewPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    await user.selectOptions(screen.getByLabelText('테이블 이름'), 'custom');
    await user.type(screen.getByLabelText('직접 입력'), '자재');
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(saveOfficeProductData).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            id: 7,
            office_code: 'OFF-1',
            office_name: '본점',
          }),
          rows: sampleRows,
          categoryName: '자재',
          sourceFileName: 'demo.xlsx',
        }),
      );
    });
  });

  it('renders default cards, extra saved categories, and the add card', () => {
    mockCatalogState = {
      items: [
        {
          id: 1,
          categoryName: '비료',
          rowCount: 12,
          sourceFileName: 'fertilizer.xlsx',
          updatedAt: '2026-06-07T00:00:00Z',
        },
        {
          id: 2,
          categoryName: '종자',
          rowCount: 4,
          sourceFileName: 'seed.xlsx',
          updatedAt: '2026-06-07T01:00:00Z',
        },
      ],
      isLoading: false,
      errorMessage: '',
    };

    render(<ExcelExtractWorkbookReviewPage />);

    const cardList = screen.getByRole('list', { name: '등록 데이터 목록' });
    const cards = within(cardList).getAllByRole('listitem');

    expect(within(cards[0]).getByText('비료')).toBeInTheDocument();
    expect(within(cards[0]).getByText('12개 행')).toBeInTheDocument();
    expect(within(cards[1]).getByText('농약')).toBeInTheDocument();
    expect(within(cards[1]).getByText('미등록')).toBeInTheDocument();
    expect(within(cards[2]).getByText('종자')).toBeInTheDocument();
    expect(within(cards[2]).getByText('4개 행')).toBeInTheDocument();
    expect(within(cards[3]).getByText('+ 추가')).toBeInTheDocument();
  });

  it('renders loading and error states from the catalog hook', () => {
    mockCatalogState = {
      items: [],
      isLoading: true,
      errorMessage: '등록 데이터를 불러오지 못했습니다.',
    };

    render(<ExcelExtractWorkbookReviewPage />);

    expect(screen.getByText('등록 데이터 불러오는 중...')).toBeInTheDocument();
    expect(screen.getByText('등록 데이터를 불러오지 못했습니다.')).toBeInTheDocument();
  });
});
