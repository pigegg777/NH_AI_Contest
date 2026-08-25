import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PreviousDataCarryOverDialog } from '../components/data-edit-controls/excel-upload/PreviousDataCarryOverDialog';

function renderDialog(overrides = {}) {
  const props = {
    isOpen: true,
    categoryName: '비료',
    carriedImageCount: 21,
    carriedNoteCount: 8,
    onChoose: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };

  render(<PreviousDataCarryOverDialog {...props} />);

  return props;
}

describe('PreviousDataCarryOverDialog', () => {
  it('stays closed when there is nothing to ask about', () => {
    renderDialog({ isOpen: false });

    expect(
      screen.queryByTestId('excel-upload-carry-over-dialog'),
    ).not.toBeInTheDocument();
  });

  it('names the category and what would be carried', () => {
    renderDialog();

    expect(
      screen.getByText(/비료에 이미 저장된 데이터가 있습니다/),
    ).toBeInTheDocument();
    expect(screen.getByText(/사진 21건 · 비고 8건/)).toBeInTheDocument();
  });

  it('says so when the new workbook leaves nothing to carry', () => {
    renderDialog({ carriedImageCount: 0, carriedNoteCount: 0 });

    expect(
      screen.getByText(/옮길 사진이나 비고가 없습니다/),
    ).toBeInTheDocument();
  });

  it('always spells out that prices come from the new workbook', () => {
    renderDialog();

    expect(
      screen.getByText(
        '단가(과세·영세·면세)는 어느 쪽을 고르든 항상 새 엑셀 값으로 저장됩니다.',
      ),
    ).toBeInTheDocument();
  });

  it('offers exactly the two answers', () => {
    renderDialog();

    const buttons = screen
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(buttons).toEqual(['그냥 신규로', '이어받기']);
  });

  it('reports the carry answer', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderDialog();

    await user.click(screen.getByRole('button', { name: '이어받기' }));

    expect(onChoose).toHaveBeenCalledWith('carry');
  });

  it('reports the reset answer', async () => {
    const user = userEvent.setup();
    const { onChoose } = renderDialog();

    await user.click(screen.getByRole('button', { name: '그냥 신규로' }));

    expect(onChoose).toHaveBeenCalledWith('reset');
  });

  it('dismisses on the backdrop but not on the dialog itself', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderDialog();

    await user.click(screen.getByTestId('excel-upload-carry-over-dialog'));
    expect(onDismiss).not.toHaveBeenCalled();

    await user.click(
      screen.getByTestId('excel-upload-carry-over-dialog').parentElement,
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on escape', async () => {
    const user = userEvent.setup();
    const { onDismiss } = renderDialog();

    await user.keyboard('{Escape}');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('stops listening for escape once closed', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <PreviousDataCarryOverDialog
        isOpen
        categoryName="비료"
        carriedImageCount={1}
        carriedNoteCount={0}
        onChoose={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    rerender(
      <PreviousDataCarryOverDialog
        isOpen={false}
        categoryName="비료"
        carriedImageCount={1}
        carriedNoteCount={0}
        onChoose={vi.fn()}
        onDismiss={onDismiss}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
