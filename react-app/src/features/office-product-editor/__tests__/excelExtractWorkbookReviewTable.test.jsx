import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DataTableSection } from '../components/DataTableSection';
import { EditorMetaCtx, TableCtx } from '../contexts/editorContexts';
import {
  createInitialSortState,
  getTableColumnsByMode,
} from '../model/review-table/reviewTableConfigModel';
import { createInitialFilters } from '../model/review-table/reviewTableBuildModel';
import { requestAiImageList } from '../services/ai-image-apply/aiImageApplyClient';

vi.mock('../services/ai-image-apply/aiImageApplyClient', () => ({
  requestAiImageList: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

const rows = [
  {
    row_id: 'A100__01',
    product_code: 'A100',
    product_name: 'Alpha',
    nutrient: 'N-P-K',
    price_subsidy: 100,
    img_url: 'https://example.com/a100.png',
    product_url: 'https://example.com/a100',
    sale_price_type_code: '01',
    sale_price_type_name: 'base',
    large_category: 'fertilizer',
    medium_category: 'general',
    small_category: 'single',
    detail_category: null,
    tax_price: 1000,
    zero_tax_price: 900,
    spec: '20kg',
    manufacturer_list: null,
    shadow: false,
    note: '',
  },
  {
    row_id: 'B200__02',
    product_code: 'B200',
    product_name: 'Beta',
    nutrient: null,
    price_subsidy: null,
    img_url: null,
    product_url: null,
    sale_price_type_code: '02',
    sale_price_type_name: 'member',
    large_category: 'fertilizer',
    medium_category: 'general',
    small_category: 'complex',
    detail_category: null,
    tax_price: 2000,
    zero_tax_price: 1800,
    spec: '20kg',
    manufacturer_list: null,
    shadow: true,
    note: 'saved',
  },
];

function renderTable({ tableNameMode, ...tableOverrides } = {}) {
  const tableValue = {
    rows,
    warningRows: [],
    searchQuery: '',
    onSearchQueryChange: vi.fn(),
    filters: createInitialFilters(),
    filterOptions: {
      sale_price_type_name: [],
      large_category: [],
      medium_category: [],
      small_category: [],
      detail_category: [],
    },
    onFilterChange: vi.fn(),
    onResetFilters: vi.fn(),
    sortState: createInitialSortState(),
    onSortChange: vi.fn(),
    onShadowToggle: vi.fn(),
    onVisibleRowsShadowChange: vi.fn(),
    onNoteChange: vi.fn(),
    onPriceChange: vi.fn(),
    onImgUrlChange: vi.fn(),
    officeCode: 'OFF-1',
    ...tableOverrides,
  };

  return render(
    <EditorMetaCtx.Provider value={{ tableNameMode }}>
      <TableCtx.Provider value={tableValue}>
        <DataTableSection />
      </TableCtx.Provider>
    </EditorMetaCtx.Provider>,
  );
}

function getRenderedColumnKeys() {
  return screen
    .getAllByRole('columnheader')
    .map((header) => header.getAttribute('data-col') ?? 'selection');
}

describe('excel extract workbook review table', () => {
  it('groups the table controls into accessible dashboard sections', () => {
    renderTable();

    expect(screen.getByRole('region', { name: /result table controls/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /search and actions/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /filter controls/i })).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('name', 'row-search');
    expect(searchInput).toHaveAttribute('autocomplete', 'off');
  });

  it('orders columns according to the fertilizer table model', () => {
    renderTable({ tableNameMode: 'fertilizer' });

    expect(getRenderedColumnKeys()).toEqual([
      'selection',
      ...getTableColumnsByMode('fertilizer').map((column) => column.key),
    ]);
  });

  it('renders static fertilizer URLs as links and shows dashes for empty values', () => {
    renderTable({ tableNameMode: 'fertilizer' });

    const imgLink = screen.getByRole('link', { name: 'img-A100__01' });
    const productLink = screen.getByRole('link', { name: 'product-A100__01' });

    expect(imgLink).toHaveAttribute('href', 'https://example.com/a100.png');
    expect(productLink).toHaveAttribute('href', 'https://example.com/a100');
    expect(screen.queryByRole('link', { name: 'img-B200__02' })).not.toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });

  it('opens the storage picker for a row without an image and lists office storage images', async () => {
    const user = userEvent.setup();
    requestAiImageList.mockResolvedValue({
      images: [{ path: 'OFF-1/a.png', url: 'https://example.com/a.png', createdAt: null }],
    });

    renderTable({ tableNameMode: 'fertilizer' });

    await user.click(screen.getByRole('button', { name: 'img-picker-B200__02' }));

    expect(requestAiImageList).toHaveBeenCalledWith({ officeCode: 'OFF-1' });
    expect(
      await screen.findByRole('button', { name: 'img-picker-option-B200__02-OFF-1/a.png' }),
    ).toBeInTheDocument();
  });

  it('opens the storage picker for a row that already has an image, to allow swapping it', async () => {
    const user = userEvent.setup();
    requestAiImageList.mockResolvedValue({ images: [] });

    renderTable({ tableNameMode: 'fertilizer' });

    await user.click(screen.getByRole('button', { name: 'img-picker-A100__01' }));

    expect(requestAiImageList).toHaveBeenCalledWith({ officeCode: 'OFF-1' });
    expect(
      screen.getByRole('dialog', { name: 'img-picker-popover-A100__01' }),
    ).toBeInTheDocument();
  });

  it('sets the row image from the picker and closes it on selection', async () => {
    const user = userEvent.setup();
    const onImgUrlChange = vi.fn();
    requestAiImageList.mockResolvedValue({
      images: [{ path: 'OFF-1/a.png', url: 'https://example.com/a.png', createdAt: null }],
    });

    renderTable({ tableNameMode: 'fertilizer', onImgUrlChange });

    await user.click(screen.getByRole('button', { name: 'img-picker-B200__02' }));
    await user.click(
      await screen.findByRole('button', { name: 'img-picker-option-B200__02-OFF-1/a.png' }),
    );

    expect(onImgUrlChange).toHaveBeenCalledWith('B200__02', 'https://example.com/a.png');
    expect(
      screen.queryByRole('dialog', { name: 'img-picker-popover-B200__02' }),
    ).not.toBeInTheDocument();
  });

  it('hides the delete and picker buttons for a static-fertilizer-sourced image', () => {
    renderTable({
      tableNameMode: 'fertilizer',
      rows: [{ ...rows[0], img_url_is_static: true }, rows[1]],
    });

    expect(screen.queryByRole('button', { name: 'img-delete-A100__01' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'img-picker-A100__01' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'img-A100__01' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'img-picker-B200__02' })).toBeInTheDocument();
  });

  it('clears a product image by calling onImgUrlChange when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const onImgUrlChange = vi.fn();

    renderTable({ tableNameMode: 'fertilizer', onImgUrlChange });

    expect(screen.queryByRole('button', { name: 'img-delete-B200__02' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'img-delete-A100__01' }));

    expect(onImgUrlChange).toHaveBeenCalledWith('A100__01', '');
  });

  it('matches the custom-mode column set from the table model', () => {
    renderTable({ tableNameMode: 'custom' });

    const renderedColumnKeys = getRenderedColumnKeys();

    expect(renderedColumnKeys).toEqual([
      'selection',
      ...getTableColumnsByMode('custom').map((column) => column.key),
    ]);
    expect(renderedColumnKeys).not.toContain('nutrient');
    expect(renderedColumnKeys).not.toContain('price_subsidy');
    expect(renderedColumnKeys).toContain('img_url');
    expect(renderedColumnKeys).not.toContain('product_url');
  });

  it('renders the pesticide-only usage popup and column set', async () => {
    const user = userEvent.setup();

    renderTable({
      tableNameMode: 'pesticide',
      rows: [
        {
          ...rows[0],
          nutirent: 'chlorfenapyr',
          product_category: 'insecticide',
          product_usage: [
            {
              cropName: 'pepper',
              diseaseWeedName: 'thrips',
              pestiUse: 'spray',
              dilutUnit: '2000x',
              useSuittime: '3days',
              useNum: '3',
            },
          ],
          indict_symbl: '13',
        },
        {
          ...rows[1],
          nutirent: null,
          product_category: null,
          product_usage: [],
          indict_symbl: null,
        },
      ],
    });

    const renderedColumnKeys = getRenderedColumnKeys();
    expect(renderedColumnKeys).toEqual([
      'selection',
      ...getTableColumnsByMode('pesticide').map((column) => column.key),
    ]);
    expect(renderedColumnKeys).toContain('nutirent');
    expect(renderedColumnKeys).toContain('product_category');
    expect(renderedColumnKeys).toContain('product_usage');
    expect(renderedColumnKeys).toContain('indict_symbl');
    expect(renderedColumnKeys).not.toContain('price_subsidy');
    expect(renderedColumnKeys).toContain('img_url');

    const usageButton = screen.getByRole('button', { name: 'usage-cell-A100__01' });
    expect(usageButton.textContent).toContain('(1)');

    await user.click(usageButton);

    expect(screen.getByRole('dialog', { name: 'usage-popover-A100__01' })).toBeInTheDocument();
    expect(screen.getByText('pepper')).toBeInTheDocument();
    expect(screen.getByText('thrips')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'usage-close-A100__01' }));

    expect(screen.queryByRole('dialog', { name: 'usage-popover-A100__01' })).not.toBeInTheDocument();
  });

  it('shows a down arrow for the active descending sort column', () => {
    const { container } = renderTable({
      sortState: {
        key: 'product_code',
        direction: 'desc',
      },
    });

    const sortButton = container.querySelector('th[data-col="product_code"] button');
    expect(sortButton).toHaveTextContent('v');
  });

  it('reflects shadow=true as a checked row checkbox', () => {
    renderTable({ tableNameMode: 'fertilizer' });

    const shadowA = screen.getByRole('checkbox', { name: 'shadow-A100__01' });
    const shadowB = screen.getByRole('checkbox', { name: 'shadow-B200__02' });

    expect(shadowA).not.toBeChecked();
    expect(shadowB).toBeChecked();
  });

  it('renders note cell content for each row', () => {
    renderTable({ tableNameMode: 'fertilizer' });

    expect(screen.getByRole('button', { name: 'note-cell-A100__01' })).toHaveTextContent('-');
    expect(screen.getByRole('button', { name: 'note-cell-B200__02' })).toHaveTextContent('saved');
  });

  it('calls onNoteChange when note cell is edited and committed', async () => {
    const user = userEvent.setup();
    const onNoteChange = vi.fn();

    renderTable({ tableNameMode: 'fertilizer', onNoteChange });

    await user.click(screen.getByRole('button', { name: 'note-cell-A100__01' }));

    const input = screen.getByRole('textbox', { name: 'note-input-A100__01' });
    await user.clear(input);
    await user.type(input, 'new note');
    await user.keyboard('{Enter}');

    expect(onNoteChange).toHaveBeenCalledWith('A100__01', 'new note');
  });

  it('calls onShadowToggle when row shadow checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onShadowToggle = vi.fn();

    renderTable({ tableNameMode: 'fertilizer', onShadowToggle });

    await user.click(screen.getByRole('checkbox', { name: 'shadow-A100__01' }));

    expect(onShadowToggle).toHaveBeenCalledWith('A100__01');
  });

  it('calls onVisibleRowsShadowChange with all visible row ids when header checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onVisibleRowsShadowChange = vi.fn();

    renderTable({
      tableNameMode: 'fertilizer',
      rows: [{ ...rows[0], shadow: false }, { ...rows[1], shadow: false }],
      onVisibleRowsShadowChange,
    });

    const headerCheckbox = within(
      screen.getByRole('columnheader', { name: /숨길 상품 표시/ }),
    ).getByRole('checkbox');

    await user.click(headerCheckbox);

    expect(onVisibleRowsShadowChange).toHaveBeenCalledWith(
      ['A100__01', 'B200__02'],
      true,
    );
  });
});
