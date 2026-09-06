import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NongyakSuggestField from './NongyakSuggestField';

const mockUseNongyakFieldSuggestions = vi.fn();
vi.mock('../hooks/useNongyakFieldSuggestions', () => ({
  useNongyakFieldSuggestions: (...args) => mockUseNongyakFieldSuggestions(...args),
}));

afterEach(() => {
  cleanup();
  mockUseNongyakFieldSuggestions.mockReset();
});

function setup({ value = '사', suggestions = ['사과', '사과배'] } = {}) {
  mockUseNongyakFieldSuggestions.mockReturnValue(suggestions);
  const onChange = vi.fn();
  render(
    <NongyakSuggestField
      id="crop-field"
      tab="inventory"
      officeCode="OFFICE-1"
      field="crop"
      value={value}
      onChange={onChange}
      placeholder="예: 사과"
    />,
  );
  return { onChange };
}

describe('NongyakSuggestField', () => {
  it('does not show a dropdown before the input is focused', () => {
    setup();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('passes the office code through to the suggestion hook', () => {
    setup();
    expect(mockUseNongyakFieldSuggestions).toHaveBeenCalledWith({
      tab: 'inventory',
      officeCode: 'OFFICE-1',
      field: 'crop',
      query: '사',
    });
  });

  it('shows suggestion options once focused, and lets free typing still update the value', () => {
    const { onChange } = setup();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('사과')).toBeInTheDocument();
    expect(screen.getByText('사과배')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '사과' } });
    expect(onChange).toHaveBeenCalledWith('사과');
  });

  it('selects a suggestion via keyboard (ArrowDown + Enter)', () => {
    const { onChange } = setup();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('사과');
  });

  it('closes the dropdown on Escape without changing the value', () => {
    const { onChange } = setup();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('selects a suggestion on click', () => {
    const { onChange } = setup();
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);
    fireEvent.click(screen.getByText('사과배'));

    expect(onChange).toHaveBeenCalledWith('사과배');
  });

  it('renders no dropdown when there are no suggestions', () => {
    setup({ suggestions: [] });
    const input = screen.getByRole('combobox');

    fireEvent.focus(input);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
