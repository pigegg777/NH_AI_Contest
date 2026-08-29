import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCardAiDesign } from '../hooks/useCardAiDesign';
import { DEFAULT_CARD_AI_DESIGN } from '../model/card-design/ai-request/cardAiDesignModel';
import { DEFAULT_CARD_STYLE, normalizeCardStyle } from '../../storefront-view/model/card-design/style/cardStyleModel';
import { requestCardStyleAiIntent } from '../model/card-design/ai-request/cardStyleAiOrchestrator';
import { compileCardStyle } from '../model/card-design/style/cardStyleCompiler';

vi.mock('../model/card-design/ai-request/cardStyleAiOrchestrator', () => ({ requestCardStyleAiIntent: vi.fn() }));
vi.mock('../model/card-design/style/cardStyleCompiler', () => ({ compileCardStyle: vi.fn() }));

describe('useCardAiDesign', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts with the default cardStyle, empty body slots, and an empty prompt/scope', () => {
    const { result } = renderHook(() => useCardAiDesign());

    expect(result.current.cardStyle).toEqual(DEFAULT_CARD_STYLE);
    expect(result.current.bodySlots).toEqual([]);
    expect(result.current.cardAiDesign).toEqual(DEFAULT_CARD_AI_DESIGN);
  });

  it('hydrateCardStyle replaces cardStyle/bodySlots and resets the session prompt+scope', () => {
    const { result } = renderHook(() => useCardAiDesign());

    act(() => {
      result.current.setPrompt('비료 상품을 강조해줘');
      result.current.setTargetScope('header');
    });

    const storedStyle = normalizeCardStyle({
      ...DEFAULT_CARD_STYLE,
      cardsPerRow: 1,
      structuralPreset: 'image-left',
    });
    const storedSlots = [{ id: 'field-0-spec', kind: 'field', field: 'spec', label: '규격' }];

    act(() => result.current.hydrateCardStyle(storedStyle, storedSlots));

    expect(result.current.cardStyle).toEqual(storedStyle);
    expect(result.current.bodySlots).toEqual(storedSlots);
    expect(result.current.cardAiDesign).toEqual(DEFAULT_CARD_AI_DESIGN);
  });

  it('setCardsPerRow updates cardsPerRow directly without going through AI', () => {
    const { result } = renderHook(() => useCardAiDesign());

    act(() => result.current.setCardsPerRow(1));

    expect(result.current.cardStyle.cardsPerRow).toBe(1);
    expect(result.current.cardStyle.layoutPlan.cardsPerRow).toBe(1);
    expect(requestCardStyleAiIntent).not.toHaveBeenCalled();
  });

  it('rejects applying with an empty prompt and leaves cardStyle untouched', async () => {
    const { result } = renderHook(() => useCardAiDesign());

    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });

    expect(requestCardStyleAiIntent).not.toHaveBeenCalled();
    expect(result.current.cardAiErrorMessage).not.toBe('');
    expect(result.current.cardStyle).toEqual(DEFAULT_CARD_STYLE);
  });

  it('applies a successful interpretation+compile, forwarding the prompt/scope/visibleFields, and surfaces any contrast warning', async () => {
    const compiledStyle = { ...DEFAULT_CARD_STYLE, header: { ...DEFAULT_CARD_STYLE.header, fontWeight: 800 } };
    const compiledSlots = [{ id: 'field-0-spec', kind: 'field', field: 'spec', label: '규격' }];

    requestCardStyleAiIntent.mockResolvedValue({
      intent: { header: { fontWeight: 800 } },
      explanation: '제목을 더 굵게 바꿨습니다.',
      suggestion: '이미지도 같이 밝게 해보면 어울릴 것 같아요.',
    });
    compileCardStyle.mockReturnValue({ cardStyle: compiledStyle, bodySlots: compiledSlots, warning: '대비가 낮습니다.' });

    const { result } = renderHook(() => useCardAiDesign());

    act(() => {
      result.current.setPrompt('make the title bolder');
      result.current.setTargetScope('header');
    });

    await act(async () => {
      await result.current.applyCardAiDesign({
        visibleFields: ['product_name', 'spec'],
        fieldLabels: { spec: '규격' },
        productCategoryName: 'Fertilizer Upload',
      });
    });

    expect(requestCardStyleAiIntent).toHaveBeenCalledWith({
      cardAiDesign: { prompt: 'make the title bolder', targetScope: 'header' },
      visibleFields: ['product_name', 'spec'],
      productCategoryName: 'Fertilizer Upload',
      conditionFieldValueSamples: {},
      currentCardStyle: DEFAULT_CARD_STYLE,
      officeCode: undefined,
      history: [],
    });
    expect(compileCardStyle).toHaveBeenCalledWith({
      intent: { header: { fontWeight: 800 } },
      previousCardStyle: DEFAULT_CARD_STYLE,
      previousBodySlots: [],
      cardsPerRow: DEFAULT_CARD_STYLE.cardsPerRow,
      visibleFields: ['product_name', 'spec'],
      fieldLabels: { spec: '규격' },
    });
    expect(result.current.cardStyle).toEqual(compiledStyle);
    expect(result.current.bodySlots).toEqual(compiledSlots);
    expect(result.current.canUndoCardAiDesign).toBe(true);
    expect(result.current.cardAiDesign.prompt).toBe('');
    expect(result.current.cardAiMessages).toEqual([
      expect.objectContaining({ role: 'user', text: 'make the title bolder', scope: 'header' }),
      expect.objectContaining({
        role: 'assistant',
        text: '제목을 더 굵게 바꿨습니다.',
        suggestion: '이미지도 같이 밝게 해보면 어울릴 것 같아요.',
        warningMessage: '대비가 낮습니다.',
        scope: 'header',
      }),
    ]);
  });

  it('sends up to the last 6 prior messages as history and clears the input on send', async () => {
    requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '반영했습니다.', suggestion: null });
    compileCardStyle.mockReturnValue({ cardStyle: DEFAULT_CARD_STYLE, bodySlots: [], warning: '' });

    const { result } = renderHook(() => useCardAiDesign());

    act(() => result.current.setPrompt('첫 번째 요청'));
    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });

    act(() => result.current.setPrompt('두 번째 요청'));
    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });

    expect(requestCardStyleAiIntent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        history: [
          expect.objectContaining({ role: 'user', text: '첫 번째 요청' }),
          expect.objectContaining({ role: 'assistant', text: '반영했습니다.' }),
        ],
      }),
    );
    expect(result.current.cardAiDesign.prompt).toBe('');
  });

  it('hydrateCardStyle and discardCardAiDesignSession both clear the message thread', async () => {
    requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '반영했습니다.', suggestion: null });
    compileCardStyle.mockReturnValue({ cardStyle: DEFAULT_CARD_STYLE, bodySlots: [], warning: '' });

    const { result } = renderHook(() => useCardAiDesign());

    act(() => result.current.setPrompt('요청'));
    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });
    expect(result.current.cardAiMessages).toHaveLength(2);

    act(() => result.current.discardCardAiDesignSession());
    expect(result.current.cardAiMessages).toEqual([]);
  });

  it('keeps the last valid cardStyle and surfaces an error when interpretation fails', async () => {
    requestCardStyleAiIntent.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useCardAiDesign());

    act(() => result.current.setPrompt('비료 상품을 강조해줘'));
    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });

    expect(result.current.cardStyle).toEqual(DEFAULT_CARD_STYLE);
    expect(result.current.cardAiErrorMessage).toBe('network down');
  });

  it('undoLastCardAiDesign restores the snapshot taken before the last apply', async () => {
    const compiledStyle = { ...DEFAULT_CARD_STYLE, cardsPerRow: 1 };

    requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '한 칸씩 보여드렸습니다.', suggestion: null });
    compileCardStyle.mockReturnValue({ cardStyle: compiledStyle, bodySlots: [], warning: '' });

    const { result } = renderHook(() => useCardAiDesign());

    act(() => result.current.setPrompt('한 칸씩 보여줘'));
    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });

    expect(result.current.cardStyle).toEqual(compiledStyle);

    act(() => result.current.undoLastCardAiDesign());

    expect(result.current.cardStyle).toEqual(DEFAULT_CARD_STYLE);
    expect(result.current.canUndoCardAiDesign).toBe(false);
  });

  it('discardCardAiDesignSession clears the prompt/scope but keeps the compiled cardStyle', async () => {
    const compiledStyle = { ...DEFAULT_CARD_STYLE, cardsPerRow: 1 };

    requestCardStyleAiIntent.mockResolvedValue({ intent: {}, explanation: '한 칸씩 보여드렸습니다.', suggestion: null });
    compileCardStyle.mockReturnValue({ cardStyle: compiledStyle, bodySlots: [], warning: '' });

    const { result } = renderHook(() => useCardAiDesign());

    act(() => result.current.setPrompt('한 칸씩 보여줘'));
    await act(async () => {
      await result.current.applyCardAiDesign({ visibleFields: ['product_name'] });
    });
    act(() => result.current.discardCardAiDesignSession());

    expect(result.current.cardAiDesign).toEqual(DEFAULT_CARD_AI_DESIGN);
    expect(result.current.cardStyle).toEqual(compiledStyle);
  });
});
