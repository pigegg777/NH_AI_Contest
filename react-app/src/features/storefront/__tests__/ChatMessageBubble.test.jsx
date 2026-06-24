import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChatMessageBubble from '../components/ai-chat/ChatMessageBubble';

describe('ChatMessageBubble', () => {
  it('renders a user message without a scope tag or suggestion', () => {
    render(
      <ul>
        <ChatMessageBubble message={{ id: '1', role: 'user', text: '제목을 굵게 해줘' }} />
      </ul>,
    );

    expect(screen.getByText('제목을 굵게 해줘')).toBeInTheDocument();
  });

  it('renders an assistant message with its scope tag, explanation, and suggestion', () => {
    render(
      <ul>
        <ChatMessageBubble
          message={{
            id: '2',
            role: 'assistant',
            text: '제목을 더 굵게 바꿨습니다.',
            suggestion: '이미지 섹션도 같이 어울리게 바꿔보면 좋을 것 같아요.',
          }}
          scopeLabel="제목 영역"
        />
      </ul>,
    );

    expect(screen.getByText('제목 영역')).toBeInTheDocument();
    expect(screen.getByText('제목을 더 굵게 바꿨습니다.')).toBeInTheDocument();
    expect(screen.getByText('이미지 섹션도 같이 어울리게 바꿔보면 좋을 것 같아요.')).toBeInTheDocument();
  });

  it('renders the warning message when present', () => {
    render(
      <ul>
        <ChatMessageBubble
          message={{
            id: '3',
            role: 'assistant',
            text: '헤더 배경을 바꿨습니다.',
            warningMessage: '헤더 글자색과 배경색의 대비가 낮아 읽기 어려울 수 있습니다.',
          }}
        />
      </ul>,
    );

    expect(
      screen.getByText('헤더 글자색과 배경색의 대비가 낮아 읽기 어려울 수 있습니다.'),
    ).toBeInTheDocument();
  });

  it('does not render a scope tag, suggestion, or warning for a user message even if present', () => {
    render(
      <ul>
        <ChatMessageBubble
          message={{ id: '4', role: 'user', text: '요청', suggestion: '제안', warningMessage: '경고' }}
          scopeLabel="제목 영역"
        />
      </ul>,
    );

    expect(screen.queryByText('제목 영역')).not.toBeInTheDocument();
    expect(screen.queryByText('제안')).not.toBeInTheDocument();
    expect(screen.queryByText('경고')).not.toBeInTheDocument();
  });
});
