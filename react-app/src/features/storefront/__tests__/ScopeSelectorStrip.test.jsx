import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ScopeSelectorStrip from '../components/ai-chat/ScopeSelectorStrip';

const SCOPE_OPTIONS = [
  { id: 'header', label: '제목 영역', detail: '배경색, 글자색' },
  { id: 'image', label: '이미지', detail: '크기, 채우기 방식' },
];

describe('ScopeSelectorStrip', () => {
  it('renders a chip per scope option and marks the selected one as pressed', () => {
    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope="header"
        onScopeChange={vi.fn()}
        testIdPrefix="card-design-scope"
        listTestId="card-design-scope-list"
      />,
    );

    expect(screen.getByTestId('card-design-scope-list')).toBeInTheDocument();
    expect(screen.getByTestId('card-design-scope-header')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('card-design-scope-image')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onScopeChange with the clicked option id', async () => {
    const onScopeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={onScopeChange}
        testIdPrefix="card-design-scope"
        listTestId="card-design-scope-list"
      />,
    );

    await user.click(screen.getByTestId('card-design-scope-image'));
    expect(onScopeChange).toHaveBeenCalledWith('image');
  });

  it('renders an optional "none" chip that reports an empty scope', async () => {
    const onScopeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={onScopeChange}
        testIdPrefix="card-design-scope"
        listTestId="card-design-scope-list"
        includeNoneOption
      />,
    );

    expect(screen.getByTestId('card-design-scope-none')).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByTestId('card-design-scope-none'));
    expect(onScopeChange).toHaveBeenCalledWith('');
  });

  it('omits the "none" chip by default', () => {
    render(
      <ScopeSelectorStrip
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        testIdPrefix="page-design-scope"
        listTestId="page-design-scope-list"
      />,
    );

    expect(screen.queryByTestId('page-design-scope-none')).not.toBeInTheDocument();
  });
});
