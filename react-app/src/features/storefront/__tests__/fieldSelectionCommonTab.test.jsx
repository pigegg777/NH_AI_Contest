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
    derivedPageTitle: '발안농협 영농센터 농자재 정보',
    textDraft: { pageTitle: '', pageDescription: '', categoryDescription: '' },
    setTextDraft: vi.fn(),
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

  it('shows page title and description on the common tab, not field tables', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    expect(screen.getByLabelText('페이지 제목')).toBeInTheDocument();
    expect(screen.getByLabelText('페이지 설명')).toBeInTheDocument();
    expect(
      screen.queryByTestId('data-field-table-description'),
    ).not.toBeInTheDocument();
  });

  it('shows the derived title as the page title placeholder', () => {
    render(<FieldSelectionDock dataMode={buildDataMode()} onApply={vi.fn()} />);

    expect(screen.getByLabelText('페이지 제목')).toHaveAttribute(
      'placeholder',
      '발안농협 영농센터 농자재 정보',
    );
  });

  it('shows the category description and the field tables on a category tab', () => {
    render(
      <FieldSelectionDock
        dataMode={buildDataMode({ selectedCategoryId: '비료' })}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('분류 설명')).toBeInTheDocument();
    expect(screen.getByTestId('data-field-table-description')).toBeInTheDocument();
    expect(screen.queryByLabelText('페이지 제목')).not.toBeInTheDocument();
  });

  it('reports text edits back to the builder', async () => {
    const user = userEvent.setup();
    const dataMode = buildDataMode();

    render(<FieldSelectionDock dataMode={dataMode} onApply={vi.fn()} />);
    await user.type(screen.getByLabelText('페이지 제목'), '봄');

    expect(dataMode.setTextDraft).toHaveBeenCalledWith('pageTitle', '봄');
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
