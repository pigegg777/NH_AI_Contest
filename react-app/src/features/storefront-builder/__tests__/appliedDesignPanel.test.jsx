import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import AppliedDesignPanel from '../components/design-summary/AppliedDesignPanel';
import { DEFAULT_CARD_STYLE } from '../../storefront-view/model/card-style/cardStyleModel';
import { DEFAULT_PAGE_STYLE } from '../../storefront-view/model/page-style/pageStyleModel';
import {
  buildAppliedDesignHeadline,
  buildCardDesignSummary,
  buildPageDesignSummary,
} from '../model/design-summary/designSummaryModel';

const buildSummary = ({ categoryName = '농약' } = {}) => ({
  categoryName,
  headline: buildAppliedDesignHeadline(
    DEFAULT_PAGE_STYLE,
    categoryName ? DEFAULT_CARD_STYLE : null,
  ),
  page: buildPageDesignSummary(DEFAULT_PAGE_STYLE),
  card: categoryName ? buildCardDesignSummary(DEFAULT_CARD_STYLE) : null,
});

describe('AppliedDesignPanel', () => {
  it('keeps the details collapsed but still shows the headline', () => {
    render(<AppliedDesignPanel summary={buildSummary()} />);

    expect(screen.getByText(/한 줄에 2개/)).toBeInTheDocument();
    expect(screen.queryByText('카드 모양')).not.toBeInTheDocument();
  });

  it('names the category whose card design it is showing', () => {
    render(<AppliedDesignPanel summary={buildSummary()} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('농약 카드')).toBeInTheDocument();
    expect(screen.getByText('페이지 전체')).toBeInTheDocument();
  });

  it('drops the card side entirely when the preview shows no cards', () => {
    // 안내 화면이거나 고른 분류가 없을 때. 화면에 카드가 없으므로 카드
    // 디자인도 이야기하지 않는다.
    render(<AppliedDesignPanel summary={buildSummary({ categoryName: '' })} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('페이지 전체')).toBeInTheDocument();
    expect(screen.queryByText(/카드$/)).not.toBeInTheDocument();
    expect(screen.queryByText('카드 배치')).not.toBeInTheDocument();
  });

  it('renders without a summary rather than crashing the builder', () => {
    const { container } = render(<AppliedDesignPanel summary={null} />);

    expect(container).toBeEmptyDOMElement();
  });
  it('puts the page design and the card design in their own columns', () => {
    const { container } = render(<AppliedDesignPanel summary={buildSummary()} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));

    const columns = container.querySelectorAll('[class*="column"]');
    expect(columns).toHaveLength(2);
    // 왼쪽 = 페이지 전체, 오른쪽 = 고른 분류의 카드
    expect(columns[0].textContent).toContain('페이지 전체');
    expect(columns[0].textContent).toContain('검색창');
    expect(columns[1].textContent).toContain('농약 카드');
    expect(columns[1].textContent).toContain('카드 배치');
  });

  it('leaves only the page column when there is no card to describe', () => {
    const { container } = render(<AppliedDesignPanel summary={buildSummary({ categoryName: '' })} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));

    const columns = container.querySelectorAll('[class*="column"]');
    expect(columns).toHaveLength(1);
    expect(columns[0].textContent).toContain('페이지 전체');
  });

  it('never offers knobs the merchant cannot actually turn', () => {
    // emphasis 는 화면을 바꾸지 않고 titleClamp 는 바꿀 방법이 없다.
    render(<AppliedDesignPanel summary={buildSummary()} />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.queryByText('강조하는 것')).not.toBeInTheDocument();
    expect(screen.queryByText('제목 줄 수')).not.toBeInTheDocument();
  });

});
