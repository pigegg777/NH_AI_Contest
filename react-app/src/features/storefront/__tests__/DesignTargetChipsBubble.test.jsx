import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DesignTargetChipsBubble from '../components/builder-workspace/composer/DesignTargetChipsBubble';
import { CARD_DESIGN_LAYOUT_OPTIONS } from '../model/card-design/ai-request/cardDesignLayoutOptions';
import { getCardDesignScopeGuide } from '../model/card-design/ai-request/cardDesignScopeGuide';

const TARGET_OPTIONS = [
  { id: 'header', label: '제목 영역', detail: '배경색, 글자색, 굵기, 자간' },
  { id: 'image', label: '이미지', detail: '크기, 채우기 방식' },
];

// Layout labels and guide titles are UI copy that gets renamed; look them up by id so
// a rename never breaks these cases.
function layoutLabelOf(id) {
  return CARD_DESIGN_LAYOUT_OPTIONS.find((option) => option.id === id).label;
}

function guideTitleOf(scopeId) {
  return `${getCardDesignScopeGuide(scopeId).title}에서 바꿀 수 있는 것`;
}

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
      within(guide).getByText(guideTitleOf('image')),
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
      within(guide).getByText(guideTitleOf('')),
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

    // Derived from the guide so adding a scope row does not break this test — what
    // matters is that the rows are dealt into two side-by-side halves, not how many.
    const guideRows = getCardDesignScopeGuide('header').rows;
    const half = Math.ceil(guideRows.length / 2);

    expect(bodyRows).toHaveLength(half);
    expect(
      within(bodyRows[0]).getByText(guideRows[0].element),
    ).toBeInTheDocument();
    expect(
      within(bodyRows[0]).getByText(guideRows[half].element),
    ).toBeInTheDocument();
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

  it('offers the card layout control beside the card count while 전체 is selected', async () => {
    const user = userEvent.setup();
    const onChangeLayout = vi.fn();

    renderBubble({
      selectedTargetId: '',
      cardsPerRow: 1,
      onChangeCardsPerRow: vi.fn(),
      layoutOptions: CARD_DESIGN_LAYOUT_OPTIONS,
      selectedLayoutId: 'image-left',
      onChangeLayout,
    });

    const control = screen.getByTestId('storefront-card-layout');

    expect(
      within(control).getByRole('button', { name: layoutLabelOf('image-left') }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(
      within(control).getByRole('button', { name: layoutLabelOf('header-split') }),
    );
    expect(onChangeLayout).toHaveBeenCalledWith('header-split');
  });

  it('keeps all three layouts on offer whatever the card count is', () => {
    renderBubble({
      selectedTargetId: '',
      cardsPerRow: 2,
      onChangeCardsPerRow: vi.fn(),
      layoutOptions: CARD_DESIGN_LAYOUT_OPTIONS,
      selectedLayoutId: 'header-top',
      onChangeLayout: vi.fn(),
    });

    const control = screen.getByTestId('storefront-card-layout');

    expect(within(control).getAllByRole('button').map((b) => b.textContent)).toEqual(
      CARD_DESIGN_LAYOUT_OPTIONS.map((option) => option.label),
    );
  });

  it('hides the card layout control on every scope other than 전체', () => {
    renderBubble({
      selectedTargetId: 'image',
      layoutOptions: CARD_DESIGN_LAYOUT_OPTIONS,
      selectedLayoutId: 'image-left',
      onChangeLayout: vi.fn(),
    });

    expect(
      screen.queryByTestId('storefront-card-layout'),
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
