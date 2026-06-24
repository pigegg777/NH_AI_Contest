import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AiChatPanel from '../components/ai-chat/AiChatPanel';

const SCOPE_OPTIONS = [
  { id: 'header', label: '제목 영역', detail: '배경색, 글자색' },
  { id: 'image', label: '이미지', detail: '크기, 채우기 방식' },
];

describe('AiChatPanel', () => {
  it('renders the empty state when there are no messages yet', () => {
    render(
      <AiChatPanel
        messages={[]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={vi.fn()}
        sendLabel="보내기"
        sendTestId="apply-ai-suggestion"
        emptyStateText="아직 대화가 없습니다."
      />,
    );

    expect(screen.getByText('아직 대화가 없습니다.')).toBeInTheDocument();
  });

  it('renders each message with its resolved scope label and calls onSend', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(
      <AiChatPanel
        messages={[
          { id: '1', role: 'user', text: '제목 굵게', scope: 'header' },
          { id: '2', role: 'assistant', text: '제목을 굵게 바꿨습니다.', scope: 'header' },
        ]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope="header"
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={onSend}
        sendLabel="보내기"
        sendTestId="apply-ai-suggestion"
      />,
    );

    expect(screen.getByText('제목 굵게')).toBeInTheDocument();
    expect(screen.getByText('제목을 굵게 바꿨습니다.')).toBeInTheDocument();
    expect(screen.getAllByText('제목 영역').length).toBeGreaterThan(0);

    await user.click(screen.getByTestId('apply-ai-suggestion'));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('disables send while sending and shows the undo button and error message', () => {
    render(
      <AiChatPanel
        messages={[]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="card-design-scope"
        scopeListTestId="card-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={vi.fn()}
        sendLabel="보내기"
        sendTestId="apply-ai-suggestion"
        isSending
        onUndo={vi.fn()}
        undoTestId="undo-ai-changes"
        canUndo
        errorMessage="문제가 발생했습니다."
      />,
    );

    expect(screen.getByTestId('apply-ai-suggestion')).toBeDisabled();
    expect(screen.getByTestId('undo-ai-changes')).toBeInTheDocument();
    expect(screen.getByText('문제가 발생했습니다.')).toBeInTheDocument();
  });

  it('omits the undo button by default', () => {
    render(
      <AiChatPanel
        messages={[]}
        scopeOptions={SCOPE_OPTIONS}
        selectedScope=""
        onScopeChange={vi.fn()}
        scopeTestIdPrefix="page-design-scope"
        scopeListTestId="page-design-scope-list"
        inputField={<input aria-label="요청" />}
        onSend={vi.fn()}
        sendLabel="보내기"
        sendTestId="apply-page-ai-design"
      />,
    );

    expect(screen.queryByTestId('undo-ai-changes')).not.toBeInTheDocument();
  });
});
