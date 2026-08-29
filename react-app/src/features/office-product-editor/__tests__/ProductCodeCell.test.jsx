import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductCodeCell } from '../components/data-table/data-table-cell/ProductCodeCell';

describe('ProductCodeCell', () => {
  it('keeps the remove action for an AI-added row without showing a badge', () => {
    const onAppendedRowRemove = vi.fn();

    render(
      <ProductCodeCell
        row={{
          row_id: 'Z999__01',
          product_code: 'Z999',
          is_ai_appended: true,
        }}
        onAppendedRowRemove={onAppendedRowRemove}
      />,
    );

    expect(screen.getByText('Z999')).toBeInTheDocument();
    expect(screen.queryByText('추가됨')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'remove-appended-Z999__01' }));
    expect(onAppendedRowRemove).toHaveBeenCalledWith('Z999__01');
  });
});
