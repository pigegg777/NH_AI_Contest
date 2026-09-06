import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NongyakCardGrid from './NongyakCardGrid';

const mockUseNongyakUsageQuery = vi.fn();
vi.mock('../hooks/useNongyakUsageQuery', () => ({
  useNongyakUsageQuery: (...args) => mockUseNongyakUsageQuery(...args),
}));

afterEach(() => {
  cleanup();
  mockUseNongyakUsageQuery.mockReset();
});

const items = [
  { product_code: '1', product_name: '부란카트' },
  { product_code: '2', product_name: '다코닐' },
];

describe('NongyakCardGrid', () => {
  it('does not render a usage panel when no card is selected', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(
      <NongyakCardGrid tab="inventory" items={items} selectedProductCode={null} onSelectItem={() => {}} />,
    );

    expect(screen.queryByRole('heading', { name: '작물별 사용법' })).not.toBeInTheDocument();
  });

  it('renders the mobile usage panel slot right after the selected card only', () => {
    mockUseNongyakUsageQuery.mockReturnValue({ data: [], isLoading: false, isError: false });

    render(
      <NongyakCardGrid
        tab="inventory"
        items={items}
        selectedProductCode="1"
        onSelectItem={() => {}}
      />,
    );

    const headings = screen.getAllByRole('heading', { name: '작물별 사용법' });
    expect(headings).toHaveLength(1);

    const listItems = screen.getAllByRole('listitem');
    const cardIndex = listItems.findIndex((node) => node.textContent.includes('부란카트'));
    const panelIndex = listItems.findIndex((node) => node.textContent.includes('작물별 사용법'));
    expect(panelIndex).toBe(cardIndex + 1);
  });
});
