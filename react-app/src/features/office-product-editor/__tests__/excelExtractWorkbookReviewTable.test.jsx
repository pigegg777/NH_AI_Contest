import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WorkbookReviewTableSection } from '../components/workbook-review/WorkbookReviewTableSection';
import {
  SORT_DIRECTION,
  createInitialFilters,
  createInitialSortState,
  getTableColumnsByMode,
} from '../model/table';

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

function renderTable(overrides = {}) {
  return render(
    <WorkbookReviewTableSection
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
      onPriceChange={vi.fn()}
      {...overrides}
    />,
  );
}

function getRenderedColumnKeys() {
  return screen
    .getAllByRole('columnheader')
    .map((header) => header.getAttribute('data-col') ?? 'selection');
}

describe('excel extract workbook review table', () => {
  it('groups the table controls into accessible dashboard sections', () => {
    renderTable({
      onSave: vi.fn(),
      onResetData: vi.fn(),
      canSave: true,
    });

    expect(screen.getByRole('region', { name: /result table controls/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /search and actions/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /filter controls/i })).toBeInTheDocument();

    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toHaveAttribute('name', 'row-search');
    expect(searchInput).toHaveAttribute('autocomplete', 'off');
  });

  it('renders a shadow checkbox in the first column and toggles it', async () => {
    const user = userEvent.setup();
    const onShadowToggle = vi.fn();

    renderTable({ onShadowToggle });

    const checkbox = screen.getByRole('checkbox', { name: 'shadow-A100__01' });
    await user.click(checkbox);

    expect(onShadowToggle).toHaveBeenCalledWith('A100__01');
  });

  it('bulk-selects only the visible rows from the header checkbox', async () => {
    const user = userEvent.setup();
    const onVisibleRowsShadowChange = vi.fn();

    renderTable({
      rows: [rows[0]],
      onVisibleRowsShadowChange,
    });

    const headerCheckbox = within(screen.getAllByRole('columnheader')[0]).getByRole('checkbox');
    await user.click(headerCheckbox);

    expect(onVisibleRowsShadowChange).toHaveBeenCalledWith(['A100__01'], true);
  });

  it('opens a note input on cell click and saves on blur', async () => {
    const user = userEvent.setup();
    const onNoteChange = vi.fn();

    renderTable({ onNoteChange });

    await user.click(screen.getByRole('button', { name: 'note-cell-A100__01' }));

    const input = screen.getByRole('textbox', { name: 'note-input-A100__01' });
    await user.type(input, 'memo');
    await user.tab();

    expect(onNoteChange).toHaveBeenCalledWith('A100__01', 'memo');
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

  it('matches the custom-mode column set from the table model', () => {
    renderTable({ tableNameMode: 'custom' });

    const renderedColumnKeys = getRenderedColumnKeys();

    expect(renderedColumnKeys).toEqual([
      'selection',
      ...getTableColumnsByMode('custom').map((column) => column.key),
    ]);
    expect(renderedColumnKeys).not.toContain('nutrient');
    expect(renderedColumnKeys).not.toContain('price_subsidy');
    expect(renderedColumnKeys).not.toContain('img_url');
    expect(renderedColumnKeys).not.toContain('product_url');
  });

  it('opens a price input on tax_price cell click and saves the numeric value on blur', async () => {
    const user = userEvent.setup();
    const onPriceChange = vi.fn();

    renderTable({ onPriceChange });

    await user.click(screen.getByRole('button', { name: 'price-cell-tax_price-A100__01' }));

    const input = screen.getByRole('spinbutton', { name: 'price-input-tax_price-A100__01' });
    await user.clear(input);
    await user.type(input, '1500');
    await user.tab();

    expect(onPriceChange).toHaveBeenCalledWith('A100__01', 'tax_price', 1500);
  });

  it('renders the pesticide-only usage popup and column set', async () => {
    const user = userEvent.setup();

    renderTable({
      tableNameMode: 'pesticide',
      rows: [
        {
          ...rows[0],
          product_nutirent: 'chlorfenapyr',
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
          product_nutirent: null,
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
    expect(renderedColumnKeys).toContain('product_nutirent');
    expect(renderedColumnKeys).toContain('product_category');
    expect(renderedColumnKeys).toContain('product_usage');
    expect(renderedColumnKeys).toContain('indict_symbl');
    expect(renderedColumnKeys).not.toContain('price_subsidy');
    expect(renderedColumnKeys).not.toContain('img_url');

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
        direction: SORT_DIRECTION.descending,
      },
    });

    const sortButton = container.querySelector('th[data-col="product_code"] button');
    expect(sortButton).toHaveTextContent('v');
  });
});
