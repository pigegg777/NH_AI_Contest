import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TabBar } from '../components/data-edit-controls/TabBar';

const tabs = [
  { id: 'upload', label: '엑셀 업로드' },
  { id: 'ai', label: 'AI 분석' },
];

describe('TabBar', () => {
  it('marks the active tab as selected and calls onTabChange for the clicked tab', () => {
    const onTabChange = vi.fn();
    render(<TabBar tabs={tabs} activeTabId="upload" onTabChange={onTabChange} />);

    expect(screen.getByRole('tab', { name: '엑셀 업로드' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'AI 분석' })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    fireEvent.click(screen.getByRole('tab', { name: 'AI 분석' }));

    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('ai');
  });
});
