import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CategoryInformationPanel from '../components/storefront-page/category-nav/CategoryInformationPanel';

describe('CategoryInformationPanel', () => {
  it('lists every entry under the category name', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[
          { id: 'a', label: '봄철 밑거름', description: '3월 중순부터' },
          { id: 'b', label: '보관 방법', description: '직사광선을 피해' },
        ]}
      />,
    );

    expect(screen.getByText('비료 안내')).toBeInTheDocument();
    expect(screen.getByText('봄철 밑거름')).toBeInTheDocument();
    expect(screen.getByText('보관 방법')).toBeInTheDocument();
  });

  it('renders an entry with no label as description only', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[{ id: 'a', label: '', description: '안내 문구' }]}
      />,
    );

    expect(screen.getByText('안내 문구')).toBeInTheDocument();
  });

  it('renders nothing when there are no entries', () => {
    const { container } = render(
      <CategoryInformationPanel categoryName="비료" entries={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the line breaks a merchant typed', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[{ id: 'a', label: '', description: '첫째 줄\n둘째 줄' }]}
      />,
    );

    expect(screen.getByText(/첫째 줄/).textContent).toBe('첫째 줄\n둘째 줄');
  });
});
