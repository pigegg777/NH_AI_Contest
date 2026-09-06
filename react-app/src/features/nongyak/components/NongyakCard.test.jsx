import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NongyakCard from './NongyakCard';

afterEach(() => {
  cleanup();
});

const baseItem = {
  product_code: '123',
  product_name: '부란카트',
  product_category: '살균',
  indict_symbl: '아4',
  nutirent: '폴리옥신디 연무제',
  spec: null,
};

describe('NongyakCard', () => {
  it('renders the card fields with a dash for missing values', () => {
    render(<NongyakCard tab="catalog" item={baseItem} isSelected={false} onSelect={vi.fn()} />);

    expect(screen.getByText('부란카트')).toBeInTheDocument();
    expect(screen.getByText('살균')).toBeInTheDocument();
    expect(screen.getByText('아4')).toBeInTheDocument();
    expect(screen.getByText('폴리옥신디 연무제')).toBeInTheDocument();
  });

  it('shows the spec tag only on the inventory tab', () => {
    render(
      <NongyakCard
        tab="inventory"
        item={{ ...baseItem, spec: '500ml' }}
        isSelected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('500ml')).toBeInTheDocument();
  });

  it('does not render a spec tag on the catalog tab', () => {
    render(<NongyakCard tab="catalog" item={baseItem} isSelected={false} onSelect={vi.fn()} />);
    expect(screen.queryByText('500ml')).not.toBeInTheDocument();
  });

  it('calls onSelect with the item when clicked', () => {
    const onSelect = vi.fn();
    render(<NongyakCard tab="catalog" item={baseItem} isSelected={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /부란카트/ }));

    expect(onSelect).toHaveBeenCalledWith(baseItem);
  });

  it('marks the button as pressed when selected', () => {
    render(<NongyakCard tab="catalog" item={baseItem} isSelected onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /부란카트/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
