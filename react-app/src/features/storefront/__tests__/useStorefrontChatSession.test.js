import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStorefrontChatSession } from '../hooks/useStorefrontChatSession';

describe('useStorefrontChatSession', () => {
  it('starts in idle with an assistant mode-choice prompt and stable message ids', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    expect(result.current.mode).toBe('idle');
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'storefront-chat-message-1',
        role: 'assistant',
        kind: 'mode-choice',
        isActionable: true,
        text: '다음 스토어프론트 모드를 선택하세요.',
      }),
    ]);
    expect(result.current.lastApplySnapshot).toBeUndefined();
  });

  it('chooseMode switches mode, keeps the pinned mode-choice prompt actionable, and appends a transition message', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    act(() => {
      result.current.chooseMode('builder');
    });

    expect(result.current.mode).toBe('builder');
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'storefront-chat-message-1',
        role: 'assistant',
        kind: 'mode-choice',
        isActionable: true,
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-2',
        role: 'assistant',
        kind: 'mode-transition',
        mode: 'builder',
        text: 'builder 모드로 전환했습니다.',
      }),
    ]);
  });

  it('appendMessage always assigns a stable generated id', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    act(() => {
      result.current.appendMessage({
        id: 'malicious-id',
        role: 'assistant',
        kind: 'note',
        text: 'Manual note',
      });
    });

    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'storefront-chat-message-1',
        kind: 'mode-choice',
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-2',
        role: 'assistant',
        kind: 'note',
        text: 'Manual note',
      }),
    ]);
  });

  it('returnToIdle reactivates the existing mode-choice prompt instead of appending a new one', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    act(() => {
      result.current.chooseMode('preview');
      result.current.returnToIdle();
    });

    expect(result.current.mode).toBe('idle');
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'storefront-chat-message-1',
        role: 'assistant',
        kind: 'mode-choice',
        isActionable: true,
        text: '다음 스토어프론트 모드를 선택하세요.',
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-2',
        kind: 'mode-transition',
        mode: 'preview',
      }),
    ]);
  });

  it('completeMode records a summary-driven apply result, returns to idle, and reactivates the mode-choice prompt', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    act(() => {
      result.current.chooseMode('data');
      result.current.completeMode({
        summary: 'Applied 3 visible fields for Fertilizer Upload.',
        snapshot: {
          selectedCategoryId: 'Fertilizer Upload',
          committedFields: ['product_name', 'spec', 'tax_price'],
        },
      });
    });

    expect(result.current.mode).toBe('idle');
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'storefront-chat-message-1',
        kind: 'mode-choice',
        isActionable: true,
        text: '다음 스토어프론트 모드를 선택하세요.',
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-2',
        kind: 'mode-transition',
        mode: 'data',
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-3',
        kind: 'apply-result',
        text: 'Applied 3 visible fields for Fertilizer Upload.',
        snapshot: {
          selectedCategoryId: 'Fertilizer Upload',
          committedFields: ['product_name', 'spec', 'tax_price'],
        },
      }),
    ]);
    expect(result.current.lastApplySnapshot).toEqual({
      selectedCategoryId: 'Fertilizer Upload',
      committedFields: ['product_name', 'spec', 'tax_price'],
    });
  });

  it('recordSuccessfulApply appends an apply-result message and keeps only the latest snapshot', () => {
    const { result } = renderHook(() => useStorefrontChatSession());

    act(() => {
      result.current.recordSuccessfulApply({ version: 1 });
      result.current.recordSuccessfulApply({ version: 2 });
    });

    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'storefront-chat-message-1',
        kind: 'mode-choice',
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-2',
        role: 'assistant',
        kind: 'apply-result',
        snapshot: { version: 1 },
        text: '적용되었습니다.',
      }),
      expect.objectContaining({
        id: 'storefront-chat-message-3',
        role: 'assistant',
        kind: 'apply-result',
        snapshot: { version: 2 },
        text: '적용되었습니다.',
      }),
    ]);
    expect(result.current.lastApplySnapshot).toEqual({ version: 2 });
  });

  it('recordSuccessfulApply defensively copies the recorded snapshot', () => {
    const { result } = renderHook(() => useStorefrontChatSession());
    const originalSnapshot = { version: 1, nested: { flag: true } };

    act(() => {
      result.current.recordSuccessfulApply(originalSnapshot);
    });

    originalSnapshot.version = 99;
    originalSnapshot.nested.flag = false;

    expect(result.current.lastApplySnapshot).toEqual({
      version: 1,
      nested: { flag: true },
    });
    expect(result.current.messages.at(-1)).toEqual(
      expect.objectContaining({
        kind: 'apply-result',
        snapshot: {
          version: 1,
          nested: { flag: true },
        },
      }),
    );
  });
});
