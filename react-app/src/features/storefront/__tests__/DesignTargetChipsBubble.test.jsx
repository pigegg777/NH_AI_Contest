import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DesignTargetChipsBubble from '../components/chat-workspace/DesignTargetChipsBubble';
import { getCardDesignScopeGuide } from '../model/card-design/ai-request/cardDesignScopeGuide';

const TARGET_OPTIONS = [
  { id: 'header', label: '제목 영역', detail: '배경색, 글자색, 굵기, 자간' },
  { id: 'image', label: '이미지', detail: '크기, 채우기 방식' },
];

function renderBubble(overrides = {}) {
  const props = {
    label: '수정 영역',
    options: TARGET_OPTIONS,
    selectedTargetId: '',
    onSelectTarget: vi.fn(),
    getScopeGuide: getCardDesignScopeGuide,
    ...overrides,
  };

  render(<DesignTargetChipsBubble {...props} />);

  return props;
}

describe('DesignTargetChipsBubble', () => {
  it('keeps the 전체 chip reporting an empty target id', async () => {
    const user = userEvent.setup();
    const { onSelectTarget } = renderBubble({ selectedTargetId: 'header' });

    await user.click(screen.getByRole('button', { name: '전체' }));
    expect(onSelectTarget).toHaveBeenCalledWith('');
  });

  it('shows the selected scope guide without any extra interaction', () => {
    renderBubble({ selectedTargetId: 'image' });

    const guide = screen.getByTestId('storefront-design-scope-guide');

    expect(
      within(guide).getByText('이미지에서 바꿀 수 있는 것'),
    ).toBeInTheDocument();
    expect(within(guide).getByText('채우기 방식')).toBeInTheDocument();
    expect(
      within(guide).getByText('이미지를 조금 더 크게 해줘'),
    ).toBeInTheDocument();
  });

  it('shows the whole-card guide while 전체 is selected', () => {
    renderBubble({ selectedTargetId: '' });

    const guide = screen.getByTestId('storefront-design-scope-guide');

    expect(
      within(guide).getByText('카드 전체에서 바꿀 수 있는 것'),
    ).toBeInTheDocument();
    expect(within(guide).getByText('그림자')).toBeInTheDocument();
    expect(within(guide).getByText('카드 구조')).toBeInTheDocument();
  });

  it('splits the guide rows across two side-by-side halves', () => {
    renderBubble({ selectedTargetId: 'header' });

    const guide = screen.getByTestId('storefront-design-scope-guide');
    const headerCells = within(guide).getAllByRole('columnheader');
    const bodyRows = within(guide)
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('rowheader').length > 0);

    expect(headerCells.map((cell) => cell.textContent)).toEqual([
      '수정 가능 요소',
      '프롬프트 요청 예시',
      '수정 가능 요소',
      '프롬프트 요청 예시',
    ]);

    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]).getByText('배경색')).toBeInTheDocument();
    expect(within(bodyRows[0]).getByText('굵기')).toBeInTheDocument();
  });

  it('leaves the trailing half empty when the guide has an odd row count', () => {
    renderBubble({ selectedTargetId: '' });

    const guide = screen.getByTestId('storefront-design-scope-guide');
    const bodyRows = within(guide)
      .getAllByRole('row')
      .filter((row) => within(row).queryAllByRole('rowheader').length > 0);

    expect(bodyRows).toHaveLength(4);
    expect(within(bodyRows[2]).getByText('제목 위치')).toBeInTheDocument();
    expect(within(bodyRows[3]).getByText('모서리 둥글기')).toBeInTheDocument();
    expect(within(bodyRows[3]).queryAllByRole('rowheader')).toHaveLength(1);
  });

  it('offers the cards-per-row control first while 전체 is selected', async () => {
    const user = userEvent.setup();
    const onChangeCardsPerRow = vi.fn();

    renderBubble({
      selectedTargetId: '',
      cardsPerRow: 2,
      onChangeCardsPerRow,
    });

    const control = screen.getByTestId('storefront-cards-per-row');
    const guide = screen.getByTestId('storefront-design-scope-guide');

    expect(control.compareDocumentPosition(guide)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      within(control).getByRole('button', { name: '2개' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(control).getByRole('button', { name: '1개' }));
    expect(onChangeCardsPerRow).toHaveBeenCalledWith(1);
  });

  it('hides the cards-per-row control on every scope other than 전체', () => {
    renderBubble({
      selectedTargetId: 'image',
      cardsPerRow: 2,
      onChangeCardsPerRow: vi.fn(),
    });

    expect(
      screen.queryByTestId('storefront-cards-per-row'),
    ).not.toBeInTheDocument();
  });

  it('hides the cards-per-row control when no handler is supplied', () => {
    renderBubble({ selectedTargetId: '' });

    expect(
      screen.queryByTestId('storefront-cards-per-row'),
    ).not.toBeInTheDocument();
  });

  it('omits the guide when no resolver is supplied', () => {
    renderBubble({ getScopeGuide: null });

    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(
      screen.queryByTestId('storefront-design-scope-guide'),
    ).not.toBeInTheDocument();
  });
});
