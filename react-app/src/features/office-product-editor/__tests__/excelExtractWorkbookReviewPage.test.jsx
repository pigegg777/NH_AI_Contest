import { useState } from 'react';
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
const processFile = vi.fn();
const resetWorkbook = vi.fn();
const saveOfficeProductData = vi.fn();
const fetchOfficeProductData = vi.fn();
const fetchStaticProductLookup = vi.fn();

vi.mock('../hooks/useWorkbookExtraction', () => ({
  useWorkbookExtraction: () => ({
    selectedFileName: 'demo.xlsx',
    workbookFingerprint: 'workbook-fingerprint',
    result: mockResult,
    handleWorkbookChange,
    processFile,
    resetWorkbook,
  }),
}));

vi.mock('../services/office-product-data/officeProductDataMutationService', () => ({
  saveOfficeProductData: (...args) => saveOfficeProductData(...args),
}));

vi.mock('../services/office-product-data/officeProductDataReadService', () => ({
  fetchOfficeProductData: (...args) => fetchOfficeProductData(...args),
}));

vi.mock('../services/staticProductLookupService', () => ({
  fetchStaticProductLookup: (...args) => fetchStaticProductLookup(...args),
}));

vi.mock('../hooks/useOfficeProductDataCatalog', () => ({
  useOfficeProductDataCatalog: () => {
    const [items, setItems] = useState(mockCatalogState.items);

    return {
      items,
      isLoading: mockCatalogState.isLoading,
      errorMessage: mockCatalogState.errorMessage,
      removeItem: (categoryName) =>
        setItems((currentItems) => currentItems.filter((item) => item.categoryName !== categoryName)),
      upsertItem: (item) =>
        setItems((currentItems) => [
          item,
          ...currentItems.filter((existing) => existing.categoryName !== item.categoryName),
        ]),
    };
  },
}));

import OfficeProductEditorPage from '../pages/OfficeProductEditorPage';

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

const sampleRowsWithSibling = [
  sampleRows[0],
  {
    row_id: 'B200__02',
    product_code: 'B200',
    product_name: 'Beta',
    sale_price_type_code: '02',
    sale_price_type_name: '회원',
    tax_price: 2000,
    zero_tax_price: 1800,
    large_category: '비료',
    medium_category: '복합',
    small_category: '프리미엄',
    detail_category: null,
    spec: '10kg',
    manufacturer_list: null,
    shadow: false,
    note: '',
  },
];

describe('OfficeProductEditorPage', () => {
  beforeEach(() => {
    mockResult = null;
    mockCatalogState = {
      items: [],
      isLoading: false,
      errorMessage: '',
    };
    fetchStaticProductLookup.mockResolvedValue({});
    fetchOfficeProductData.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides the custom table name input until add is selected', () => {
    render(<OfficeProductEditorPage />);

    expect(screen.queryByLabelText('테이블 이름')).not.toBeInTheDocument();
  });

  it('shows the custom table name input when add is selected', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    const input = screen.getByLabelText('테이블 이름');

    expect(screen.getByText('새 테이블 이름')).toBeInTheDocument();
    expect(
      screen.getByText('새 카테고리 이름을 만든 뒤 사이드바에서 선택해 업로드하세요'),
    ).toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input.tagName.toLowerCase()).toBe('input');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveFocus();
  });

  it('preserves typed custom table name when switching between default and add', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    const input = screen.getByLabelText('테이블 이름');
    await user.type(input, '자재');
    await user.click(screen.getByRole('button', { name: /비료/i }));

    expect(screen.queryByLabelText('테이블 이름')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(screen.getByLabelText('테이블 이름')).toHaveValue('자재');
  });

  it('saves after a custom table is created and then selected from the sidebar', async () => {
    const user = userEvent.setup();

    mockResult = { warnings: [], rows: sampleRows };
    saveOfficeProductData.mockResolvedValue({
      id: 1,
      row_count: 1,
      updated_at: '2026-06-07T00:00:00Z',
    });

    render(
      <OfficeProductEditorPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
    await user.type(screen.getByLabelText('테이블 이름'), '자재');
    await user.click(screen.getByRole('button', { name: '만들기' }));
    await user.click(screen.getAllByRole('button', { name: /자재/i })[0]);
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

  it('keeps save disabled until a created category is selected from the sidebar', async () => {
    const user = userEvent.setup();

    mockResult = { warnings: [], rows: sampleRows };

    render(
      <OfficeProductEditorPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(
      screen.getByText('저장하려면 먼저 사이드바에서 카테고리를 선택하세요.'),
    ).toBeInTheDocument();
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
      <OfficeProductEditorPage
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

  it('renders the save button inside the result section for registered data review', async () => {
    const user = userEvent.setup();

    mockCatalogState = {
      items: [
        {
          id: 1,
          categoryName: '비료',
          rowCount: 1,
          sourceFileName: 'fertilizer.xlsx',
          updatedAt: '2026-06-07T00:00:00Z',
        },
      ],
      isLoading: false,
      errorMessage: '',
    };
    fetchOfficeProductData.mockResolvedValue({
      rows: sampleRows,
      sourceFileName: 'fertilizer.xlsx',
      updatedAt: '2026-06-07T00:00:00Z',
      rowCount: 1,
    });

    render(
      <OfficeProductEditorPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    const fertilizerCardButton = screen
      .getAllByRole('button', { name: /비료/i })
      .find((button) => !button.getAttribute('aria-label'));
    await user.click(fertilizerCardButton);

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    expect(screen.getByText('집계 결과')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장하기' })).toBeEnabled();
  });

  it('saves only the currently rendered rows from the result section', async () => {
    const user = userEvent.setup();

    mockResult = { warnings: [], rows: sampleRowsWithSibling };
    saveOfficeProductData.mockResolvedValue({
      id: 1,
      row_count: 1,
      updated_at: '2026-06-07T00:00:00Z',
    });

    render(
      <OfficeProductEditorPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    const fertilizerCardButton = screen
      .getAllByRole('button', { name: /비료/i })
      .find((button) => !button.getAttribute('aria-label'));
    await user.click(fertilizerCardButton);

    await user.type(screen.getByRole('searchbox'), 'Alpha');

    await user.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(saveOfficeProductData).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryName: '비료',
          rows: [expect.objectContaining({ row_id: 'A100__01', product_name: 'Alpha' })],
        }),
      );
    });
  });

  it('marks a category as 등록됨 in the sidebar after saving it', async () => {
    const user = userEvent.setup();

    mockResult = { warnings: [], rows: sampleRows };
    saveOfficeProductData.mockResolvedValue({
      id: 1,
      row_count: 1,
      updated_at: '2026-06-07T00:00:00Z',
    });

    render(
      <OfficeProductEditorPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    const fertilizerCardButton = screen
      .getAllByRole('button', { name: /비료/i })
      .find((button) => !button.getAttribute('aria-label'));
    await user.click(fertilizerCardButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장하기' })).toBeEnabled();
    });
    await user.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(saveOfficeProductData).toHaveBeenCalled();
    });

    const pesticideCardButton = screen
      .getAllByRole('button', { name: /농약/i })
      .find((button) => !button.getAttribute('aria-label'));
    await user.click(pesticideCardButton);

    const cardList = screen.getByRole('list', { name: '등록 데이터 목록' });
    const cards = within(cardList).getAllByRole('listitem');

    expect(within(cards[0]).getByText('비료')).toBeInTheDocument();
    expect(within(cards[0]).getByText('등록됨')).toBeInTheDocument();
  });

  it('does not render a manual merge button', () => {
    render(<OfficeProductEditorPage />);

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

    render(<OfficeProductEditorPage />);

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

    render(<OfficeProductEditorPage />);

    expect(screen.getByText('등록 데이터 불러오는 중...')).toBeInTheDocument();
    expect(screen.getByText('등록 데이터를 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('shows an empty-selection prompt before a category is chosen', () => {
    render(<OfficeProductEditorPage />);

    expect(screen.getAllByText('왼쪽에서 데이터를 선택하세요')).toHaveLength(2);
    expect(screen.getByText('등록 데이터를 선택하거나 추가하세요')).toBeInTheDocument();
  });

  it('renders saved rows and a 편집 중 status when a registered category is selected', async () => {
    const user = userEvent.setup();

    mockCatalogState = {
      items: [
        {
          id: 1,
          categoryName: '비료',
          rowCount: 1,
          sourceFileName: 'fertilizer.xlsx',
          updatedAt: '2026-06-07T00:00:00Z',
        },
      ],
      isLoading: false,
      errorMessage: '',
    };
    fetchOfficeProductData.mockResolvedValue({
      rows: sampleRows,
      sourceFileName: 'fertilizer.xlsx',
      updatedAt: '2026-06-07T00:00:00Z',
      rowCount: 1,
    });

    render(
      <OfficeProductEditorPage
        user={{ id: 7, office_code: 'OFF-1', office_name: '본점' }}
      />,
    );

    const fertilizerCardButton = screen
      .getAllByRole('button', { name: /비료/i })
      .find((button) => !button.getAttribute('aria-label'));
    await user.click(fertilizerCardButton);

    expect(screen.getByRole('heading', { name: '비료' })).toBeInTheDocument();
    expect(screen.getByText('등록됨 · 편집 중')).toBeInTheDocument();

    const cardList = screen.getByRole('list', { name: '등록 데이터 목록' });
    expect(within(cardList).getByText('편집 중')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument();
    });

    expect(
      screen.getByText('⚠️ 새 파일 선택 시 현재 저장된 데이터가 삭제되고 새 파일로 완전히 교체됩니다.'),
    ).toBeInTheDocument();
    expect(fetchOfficeProductData).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      categoryName: '비료',
    });
  });

  it('keeps the upload dropzone disabled until a sidebar category is actually selected', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(
      screen.getByText('생산경제시스템 31-6447 엑셀을 끌어다 놓거나 선택하세요'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('테이블을 만든 뒤 사이드바에서 선택하면 업로드할 수 있습니다.'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('테이블 이름'), '자재');

    expect(
      screen.getByText('테이블을 만든 뒤 사이드바에서 선택하면 업로드할 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('disables the 만들기 button only until a table name is entered', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(screen.getByRole('button', { name: '만들기' })).toBeDisabled();

    await user.type(screen.getByLabelText('테이블 이름'), '비료');

    expect(screen.getByRole('button', { name: '만들기' })).toBeEnabled();
  });

  it('adds a sidebar entry for the new table name when 만들기 is clicked without auto-selecting it', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
    await user.type(screen.getByLabelText('테이블 이름'), '자재');
    await user.click(screen.getByRole('button', { name: '만들기' }));

    const cardList = screen.getByRole('list', { name: '등록 데이터 목록' });
    expect(within(cardList).getByText('자재')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '만들기' })).toBeDisabled();
    expect(screen.getByLabelText('테이블 이름')).toHaveValue('');
    expect(screen.queryByRole('heading', { name: '자재' })).not.toBeInTheDocument();
    expect(screen.queryByText('신규 등록')).not.toBeInTheDocument();
  });

  it('shows the new custom category only after the sidebar item is clicked', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    expect(screen.getByText('현재 작업')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    expect(screen.queryByText('현재 작업')).not.toBeInTheDocument();
    expect(screen.queryByText('현재 등록/편집 데이터')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('테이블 이름'), '자재');

    expect(screen.queryByText('현재 등록/편집 데이터')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '자재' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '만들기' }));

    expect(screen.queryByText('현재 등록/편집 데이터')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '자재' })).not.toBeInTheDocument();
    expect(screen.queryByText('신규 등록')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /자재/i })[0]);

    expect(screen.getByText('현재 등록/편집 데이터')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '자재' })).toBeInTheDocument();
    expect(screen.getByText('신규 등록')).toBeInTheDocument();
  });

  it('does not render a fixed table-name card once a category is selected', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /비료/i }));

    expect(screen.queryByText('자동으로 지정된 테이블 이름입니다')).not.toBeInTheDocument();
    expect(screen.queryByText('직접 추가한 테이블 이름입니다')).not.toBeInTheDocument();
  });

  it('clears the input after creating a table so the draft is not reused', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
    await user.type(screen.getByLabelText('테이블 이름'), '일반자재');
    await user.click(screen.getByRole('button', { name: '만들기' }));

    expect(screen.getByLabelText('테이블 이름')).toHaveValue('');
  });

  it('shows an error when trying to create 비료 or 농약 from the input', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));

    const tableNameInput = screen.getByLabelText('테이블 이름');

    await user.type(tableNameInput, '비료');
    expect(tableNameInput).toHaveValue('비료');
    await user.click(screen.getByRole('button', { name: '만들기' }));
    expect(
      screen.getByText('기본 카테고리는 사이드바에서 선택하세요'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '비료' })).not.toBeInTheDocument();
    expect(fetchOfficeProductData).not.toHaveBeenCalled();

    await user.clear(tableNameInput);
    await user.type(tableNameInput, '농약');
    expect(tableNameInput).toHaveValue('농약');
    await user.click(screen.getByRole('button', { name: '만들기' }));
    expect(
      screen.getByText('기본 카테고리는 사이드바에서 선택하세요'),
    ).toBeInTheDocument();
  });

  it('shows an error for an existing custom category and requires sidebar click to proceed', async () => {
    const user = userEvent.setup();

    render(<OfficeProductEditorPage />);

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
    await user.type(screen.getByLabelText('테이블 이름'), '자재');
    await user.click(screen.getByRole('button', { name: '만들기' }));

    await user.click(screen.getByRole('button', { name: /\+ 추가/i }));
    await user.type(screen.getByLabelText('테이블 이름'), '자재');
    await user.click(screen.getByRole('button', { name: '만들기' }));

    expect(
      screen.getByText('이미 있는 카테고리입니다. 사이드바에서 선택하세요'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '자재' })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /자재/i })[0]);

    expect(screen.getByRole('heading', { name: '자재' })).toBeInTheDocument();
  });
});

