import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import OfficeInformationPanel from '../components/storefront-page/category-nav/OfficeInformationPanel';
import CategoryInformationPanel from '../components/storefront-page/category-nav/CategoryInformationPanel';

describe('information panel emphasis', () => {
  it('emphasises marked text in the office panel', () => {
    render(
      <OfficeInformationPanel
        entries={[
          { id: 'o1', label: '가격 안내', description: '[[영세가격]]은 등록자 전용' },
        ]}
      />,
    );

    expect(screen.getByTestId('information-text-important').textContent).toBe(
      '영세가격',
    );
  });

  it('emphasises marked text in the category panel', () => {
    render(
      <CategoryInformationPanel
        categoryName="비료"
        entries={[
          { id: 'c1', label: '', description: '<<봄철 밑거름>> 안내입니다' },
        ]}
      />,
    );

    expect(screen.getByTestId('information-text-heading').textContent).toBe(
      '봄철 밑거름',
    );
  });

  it('leaves the label alone — markers there stay literal', () => {
    render(
      <OfficeInformationPanel
        entries={[{ id: 'o1', label: '[[가격]]', description: '본문' }]}
      />,
    );

    expect(screen.getByText('[[가격]]')).toBeInTheDocument();
    expect(
      screen.queryByTestId('information-text-important'),
    ).not.toBeInTheDocument();
  });

  it('still renders ordinary text unchanged', () => {
    render(
      <OfficeInformationPanel
        entries={[{ id: 'o1', label: '', description: '[비료] 관련 안내입니다' }]}
      />,
    );

    expect(screen.getByText('[비료] 관련 안내입니다')).toBeInTheDocument();
  });
});
