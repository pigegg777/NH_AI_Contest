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

  it('opens a guide table for the clicked chip and closes it on a second click', async () => {
    const user = userEvent.setup();
    renderBubble();

    const infoButton = screen.getByRole('button', {
      name: '이미지에서 바꿀 수 있는 것 보기',
    });
    expect(infoButton).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByTestId('storefront-design-scope-guide'),
    ).not.toBeInTheDocument();

    await user.click(infoButton);

    const guide = screen.getByTestId('storefront-design-scope-guide');
    expect(infoButton).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(guide).getByText('이미지에서 바꿀 수 있는 것'),
    ).toBeInTheDocument();
    expect(within(guide).getByText('채우기 방식')).toBeInTheDocument();
    expect(
      within(guide).getByText('이미지를 조금 더 크게 해줘'),
    ).toBeInTheDocument();

    await user.click(infoButton);
    expect(
      screen.queryByTestId('storefront-design-scope-guide'),
    ).not.toBeInTheDocument();
  });

  it('gives the 전체 chip a guide covering the whole card frame', async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.click(
      screen.getByRole('button', { name: '전체에서 바꿀 수 있는 것 보기' }),
    );

    const guide = screen.getByTestId('storefront-design-scope-guide');
    expect(within(guide).getByText('카드 전체에서 바꿀 수 있는 것')).toBeInTheDocument();
    expect(within(guide).getByText('그림자')).toBeInTheDocument();
    expect(within(guide).getByText('카드 구조')).toBeInTheDocument();
  });

  it('switches the guide when another chip info button is clicked', async () => {
    const user = userEvent.setup();
    renderBubble();

    await user.click(
      screen.getByRole('button', { name: '이미지에서 바꿀 수 있는 것 보기' }),
    );
    await user.click(
      screen.getByRole('button', { name: '제목 영역에서 바꿀 수 있는 것 보기' }),
    );

    const guide = screen.getByTestId('storefront-design-scope-guide');
    expect(
      within(guide).getByText('제목 영역에서 바꿀 수 있는 것'),
    ).toBeInTheDocument();
    expect(
      within(guide).getByText('제목 문구 자체는 바꿀 수 없습니다.'),
    ).toBeInTheDocument();
  });

  it('omits the info buttons when no guide resolver is supplied', () => {
    renderBubble({ getScopeGuide: null });

    expect(screen.getByRole('button', { name: '전체' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /바꿀 수 있는 것 보기$/ }),
    ).not.toBeInTheDocument();
  });
});
