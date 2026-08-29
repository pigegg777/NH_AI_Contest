import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePageAiDesign } from '../hooks/usePageAiDesign';
import { DEFAULT_PAGE_AI_DESIGN } from '../model/page-design/ai-request/pageAiDesignModel';
import { DEFAULT_PAGE_STYLE } from '../../storefront-view/model/page-design/style/pageStyleModel';
import { requestPageStyleAiIntent } from '../model/page-design/ai-request/pageStyleAiOrchestrator';
import { compilePageStyle } from '../model/page-design/style/pageStyleCompiler';

vi.mock('../model/page-design/ai-request/pageStyleAiOrchestrator', () => ({ requestPageStyleAiIntent: vi.fn() }));
vi.mock('../model/page-design/style/pageStyleCompiler', () => ({ compilePageStyle: vi.fn() }));

describe('usePageAiDesign', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with the white default pageStyle and empty prompt', () => {
    const { result } = renderHook(() => usePageAiDesign());

    expect(result.current.pageStyle).toEqual(DEFAULT_PAGE_STYLE);
    expect(result.current.pageAiDesign).toEqual(DEFAULT_PAGE_AI_DESIGN);
  });

  it('hydratePageStyle replaces pageStyle and resets the prompt', () => {
    const { result } = renderHook(() => usePageAiDesign());

    act(() => {
      result.current.setPrompt('warm and friendly, make the search stronger');
      result.current.setTargetScope('search');
    });

    const stored = {
      ...DEFAULT_PAGE_STYLE,
      palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#2563eb' },
    };

    act(() => result.current.hydratePageStyle(stored));

    expect(result.current.pageStyle.palette.accentHex).toBe('#2563eb');
    expect(result.current.pageAiDesign).toEqual(DEFAULT_PAGE_AI_DESIGN);
  });

  it('rejects applying with no prompt and leaves pageStyle untouched', async () => {
    const { result } = renderHook(() => usePageAiDesign());

    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(requestPageStyleAiIntent).not.toHaveBeenCalled();
    expect(result.current.pageAiErrorMessage).not.toBe('');
    expect(result.current.pageStyle).toEqual(DEFAULT_PAGE_STYLE);
  });

  it('applies a successful interpretation+compile and forwards the selected target scope', async () => {
    const compiledStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#ea580c' },
    };

    requestPageStyleAiIntent.mockResolvedValue({
      intent: {
        palette: compiledStyle.palette,
        header: null,
        categoryChips: null,
        search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
      },
      explanation: '검색창을 더 크고 강하게 바꿨습니다.',
      suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.',
    });
    compilePageStyle.mockReturnValue(compiledStyle);

    const { result } = renderHook(() => usePageAiDesign());

    act(() => {
      result.current.setPrompt('warm and friendly, make the search box larger with a stronger border');
      result.current.setTargetScope('search');
    });

    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(requestPageStyleAiIntent).toHaveBeenCalledWith({
      pageAiDesign: {
        prompt: 'warm and friendly, make the search box larger with a stronger border',
        targetScope: 'search',
      },
      currentPageStyle: DEFAULT_PAGE_STYLE,
      officeCode: undefined,
      history: [],
    });
    expect(compilePageStyle).toHaveBeenCalledWith({
      intent: {
        palette: compiledStyle.palette,
        header: null,
        categoryChips: null,
        search: { sizeToken: 'lg', borderStrengthToken: 'strong' },
      },
      previousPageStyle: DEFAULT_PAGE_STYLE,
      targetScope: 'search',
    });
    expect(result.current.pageStyle).toEqual(compiledStyle);
    expect(result.current.pageAiErrorMessage).toBe('');
    expect(result.current.isApplyingPageAiDesign).toBe(false);
    expect(result.current.pageAiDesign.prompt).toBe('');
    expect(result.current.pageAiMessages).toEqual([
      expect.objectContaining({ role: 'user', text: 'warm and friendly, make the search box larger with a stronger border', scope: 'search' }),
      expect.objectContaining({
        role: 'assistant',
        text: '검색창을 더 크고 강하게 바꿨습니다.',
        suggestion: '헤더 색상도 같이 어울리게 바꿔보면 좋을 것 같아요.',
        scope: 'search',
      }),
    ]);
  });

  it('sends up to the last 6 prior messages as history and clears the input on send', async () => {
    requestPageStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '반영했습니다.', suggestion: null });
    compilePageStyle.mockReturnValue(DEFAULT_PAGE_STYLE);

    const { result } = renderHook(() => usePageAiDesign());

    act(() => result.current.setPrompt('첫 번째 요청'));
    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    act(() => result.current.setPrompt('두 번째 요청'));
    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(requestPageStyleAiIntent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        history: [
          expect.objectContaining({ role: 'user', text: '첫 번째 요청' }),
          expect.objectContaining({ role: 'assistant', text: '반영했습니다.' }),
        ],
      }),
    );
    expect(result.current.pageAiDesign.prompt).toBe('');
  });

  it('keeps the last valid pageStyle and surfaces an error when interpretation fails', async () => {
    requestPageStyleAiIntent.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => usePageAiDesign());

    act(() => {
      result.current.setPrompt('warm');
      result.current.setTargetScope('header');
    });
    await act(async () => {
      await result.current.applyPageAiDesign();
    });

    expect(result.current.pageStyle).toEqual(DEFAULT_PAGE_STYLE);
    expect(result.current.pageAiErrorMessage).toBe('network down');
  });

  it('discardPageAiDesignSession clears the prompt but keeps the compiled pageStyle', async () => {
    const compiledStyle = {
      ...DEFAULT_PAGE_STYLE,
      palette: { ...DEFAULT_PAGE_STYLE.palette, accentHex: '#7c3aed' },
    };

    requestPageStyleAiIntent.mockResolvedValue({
      intent: {
        palette: compiledStyle.palette,
        header: null,
        categoryChips: null,
        search: null,
      },
      explanation: '보라색으로 바꾸고 제목을 굵게 했습니다.',
      suggestion: null,
    });
    compilePageStyle.mockReturnValue(compiledStyle);

    const { result } = renderHook(() => usePageAiDesign());

    act(() => {
      result.current.setPrompt('cool purple, make the title bolder');
      result.current.setTargetScope('header');
    });

    await act(async () => {
      await result.current.applyPageAiDesign();
    });
    act(() => result.current.discardPageAiDesignSession());

    expect(result.current.pageAiDesign).toEqual(DEFAULT_PAGE_AI_DESIGN);
    expect(result.current.pageStyle).toEqual(compiledStyle);
  });
});
