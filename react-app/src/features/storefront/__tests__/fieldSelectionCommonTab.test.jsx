import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import FieldSelectionDock from '../components/builder-workspace/field-selection/FieldSelectionDock';

function buildDataMode(overrides = {}) {
  return {
    categoryTabs: [
      { id: 'common', label: '공통 요소' },
      { id: '비료', label: '비료' },
    ],
    selectedCategoryId: 'common',
    selectCategory: vi.fn(),
    availableCategoryFields: [
      { key: 'product_name', label: '상품명', isSelectable: true },
    ],
    draftFields: ['product_name'],
    committedFields: ['product_name'],
    toggleField: vi.fn(),
    hasPendingChanges: false,
    goBack: vi.fn(),
    officeInfoEntries: [],
    setOfficeInfoEntries: vi.fn(),
    categoryInfoEntries: [],
    setCategoryInfoEntries: vi.fn(),
    ...overrides,
  };
}

describe('field selection common tab', () => {
  it('offers 공통 요소 in the tab row', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    const tabs = screen.getByTestId('storefront-sticky-category-tabs');

    expect(within(tabs).getByRole('tab', { name: '공통 요소' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('shows the office entries on the common tab, not field tables', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    expect(screen.getByText('사무소 안내')).toBeInTheDocument();
    expect(
      screen.queryByTestId('data-field-table-description'),
    ).not.toBeInTheDocument();
  });

  // The page title moved to the page-design composer, under the 상단 제목 글자 chip.
  it('no longer carries the page title on either tab', () => {
    const { rerender } = render(
      <FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />,
    );

    expect(screen.queryByLabelText('페이지 제목')).not.toBeInTheDocument();

    rerender(
      <FieldSelectionDock
        dataMode={buildDataMode({ selectedCategoryId: '비료' })}
        onApply={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('페이지 제목')).not.toBeInTheDocument();
  });

  it('shows the category entries and the field tables on a category tab', () => {
    render(
      <FieldSelectionDock
        dataMode={buildDataMode({ selectedCategoryId: '비료' })}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText('분류 안내')).toBeInTheDocument();
    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
  });

  it('edits the office entries on the common tab', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode({
      officeInfoEntries: [{ id: 'o1', label: '', description: '' }],
    });

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);
    await user.type(screen.getByLabelText('라벨'), '영');

    expect(dataMode.setOfficeInfoEntries).toHaveBeenCalledWith([
      { id: 'o1', label: '영', description: '' },
    ]);
  });

  it('edits the category entries on a category tab', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode({
      selectedCategoryId: '비료',
      categoryInfoEntries: [{ id: 'c1', label: '', description: '' }],
    });

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);
    await user.type(screen.getByLabelText('라벨'), '봄');

    expect(dataMode.setCategoryInfoEntries).toHaveBeenCalledWith([
      { id: 'c1', label: '봄', description: '' },
    ]);
  });

  it('takes the category entry description as multiline text', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode({
      selectedCategoryId: '비료',
      categoryInfoEntries: [{ id: 'c1', label: '', description: '' }],
    });

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);

    const description = screen.getByLabelText('설명');

    expect(description.tagName).toBe('TEXTAREA');

    // An <input> ignores Enter entirely, so reporting a newline is the
    // behaviour that separates the two. setCategoryInfoEntries is a stateless
    // mock here, so each keystroke arrives against an empty value.
    await user.type(description, '{Enter}');

    expect(dataMode.setCategoryInfoEntries).toHaveBeenCalledWith([
      { id: 'c1', label: '', description: '\n' },
    ]);
  });

  it('keeps the save button on both tabs', () => {
    const { rerender } = render(
      <FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: '저장하기' })).toBeInTheDocument();

    rerender(
      <FieldSelectionDock
        dataMode={buildDataMode({ selectedCategoryId: '비료' })}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '저장하기' })).toBeInTheDocument();
  });
});
