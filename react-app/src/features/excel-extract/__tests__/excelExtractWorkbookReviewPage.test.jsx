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
const fetchStaticFertilizerLookup = vi.fn();

vi.mock('../hooks/useWorkbookExtraction', () => ({
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

vi.mock('../services/staticFertilizerLookupService', () => ({
  fetchStaticFertilizerLookup: (...args) => fetchStaticFertilizerLookup(...args),
}));

vi.mock('../hooks/useOfficeProductDataCatalog', () => ({
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
    fetchStaticFertilizerLookup.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides the custom table name input until add is selected', () => {
    render(<ExcelExtractWorkbookReviewPage />);

    expect(screen.queryByLabelText('테이블 이름')).not.toBeInTheDocument();
  });

  it('shows the custom table name input when add is selected', async () => {
    const user = userEvent.setup();

    render(<ExcelExtractWorkbookReviewPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    const input = screen.getByLabelText('테이블 이름');

    expect(screen.getByText('새 테이블 이름')).toBeInTheDocument();
    expect(
      screen.getByText('추가할 테이블 이름을 입력한 뒤 저장하세요'),
    ).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input.tagName.toLowerCase()).toBe('input');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveFocus();
  });

  it('preserves typed custom table name when switching between default and add', async () => {
    const user = userEvent.setup();

    render(<ExcelExtractWorkbookReviewPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    const input = screen.getByLabelText('테이블 이름');
    await user.type(input, '자재');
    await user.click(screen.getByRole('button', { name: /비료/i }));

    expect(screen.queryByLabelText('테이블 이름')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(screen.getByLabelText('테이블 이름')).toHaveValue('자재');
  });

  it('saves with the table name entered after add is selected', async () => {
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

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
    await user.type(screen.getByLabelText('테이블 이름'), '자재');
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

  it('keeps save disabled when add is selected without a custom table name', async () => {
    const user = userEvent.setup();

    mockResult = { warnings: [], rows: sampleRows };

    render(
      <ExcelExtractWorkbookReviewPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(screen.getByText('저장 전에 테이블 이름을 입력하세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled();
  });

  it('saves with the selected default category name', async () => {
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

    await user.click(screen.getByRole('button', { name: /비료/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장하기' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(saveOfficeProductData).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryName: '비료',
        }),
      );
    });
  });

  it('does not render a manual merge button', () => {
    render(<ExcelExtractWorkbookReviewPage />);

    expect(screen.queryByRole('button', { name: '병합하기' })).not.toBeInTheDocument();
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
