import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResultTableSection } from '../components/ResultTableSection';
import { createInitialFilters, createInitialSortState } from '../model/table';

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
      onPriceChange={vi.fn()}
      {...overrides}
    />,
  );
}

describe('excel extract workbook review table', () => {
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

    const checkbox = screen.getByRole('checkbox', { name: /숨길 상품 표시/i });
    await user.click(checkbox);

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

  it('orders columns per the requested layout for fertilizer mode', () => {
    renderTable({ tableNameMode: 'fertilizer' });

    const columnHeaders = screen.getAllByRole('columnheader').map((header) =>
      header.textContent?.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[v^]/g, ''),
    );

    const expectedOrder = [
      '상품코드',
      '상품명',
      '규격',
      '유형코드',
      '단가유형',
      '과세단가',
      '영세단가',
      '보조금',
      '비고',
      '성분',
      '이미지 url',
      '상품 url',
      '대분류',
      '중분류',
      '소분류',
      '세분류',
      '제조업체',
    ];

    expectedOrder.forEach((label) => {
      expect(columnHeaders).toContain(label);
    });

    for (let i = 1; i < expectedOrder.length; i += 1) {
      expect(columnHeaders.indexOf(expectedOrder[i])).toBe(
        columnHeaders.indexOf(expectedOrder[i - 1]) + 1,
      );
    }
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

  it('hides nutrient, subsidy, and url columns and orders the rest for the default table mode', () => {
    renderTable({ tableNameMode: 'custom' });

    const columnHeaders = screen.getAllByRole('columnheader').map((header) =>
      header.textContent?.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[v^]/g, ''),
    );

    expect(columnHeaders).not.toContain('성분');
    expect(columnHeaders).not.toContain('보조금');
    expect(columnHeaders).not.toContain('이미지 url');
    expect(columnHeaders).not.toContain('상품 url');

    const expectedOrder = [
      '상품코드',
      '상품명',
      '규격',
      '유형코드',
      '단가유형',
      '과세단가',
      '영세단가',
      '비고',
      '대분류',
      '중분류',
      '소분류',
      '세분류',
      '제조업체',
    ];

    expectedOrder.forEach((label) => {
      expect(columnHeaders).toContain(label);
    });

    for (let i = 1; i < expectedOrder.length; i += 1) {
      expect(columnHeaders.indexOf(expectedOrder[i])).toBe(
        columnHeaders.indexOf(expectedOrder[i - 1]) + 1,
      );
    }
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
});

