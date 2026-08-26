import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInformationEmphasisAi } from '../hooks/useInformationEmphasisAi';
import { postInformationEmphasisAiRequest } from '../services/information-emphasis/informationEmphasisAiGateway';

vi.mock('../services/information-emphasis/informationEmphasisAiGateway', () => ({
  postInformationEmphasisAiRequest: vi.fn(),
}));

const SOURCE = '비료: 요소 20kg 15,000원';
const MARKED = '<<비료:>> 요소 20kg 15,000원';
const ENTRY = { id: 'ie-1', label: '영세가격 안내', description: SOURCE };

function renderEmphasisHook() {
  const onApplyDescription = vi.fn();
  const view = renderHook(() =>
    useInformationEmphasisAi({ officeCode: 'OFF-1', onApplyDescription }),
  );

  return { ...view, onApplyDescription };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useInformationEmphasisAi', () => {
  it('applies the marked-up description the server returned', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: MARKED });
    const { result, onApplyDescription } = renderEmphasisHook();

    await act(async () => {
      await result.current.applyEmphasis(ENTRY);
    });

    expect(postInformationEmphasisAiRequest).toHaveBeenCalledWith({
      officeCode: 'OFF-1',
      label: '영세가격 안내',
      description: SOURCE,
    });
    expect(onApplyDescription).toHaveBeenCalledWith('ie-1', MARKED);
  });

  it('offers an undo that puts the seller original back', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: MARKED });
    const { result, onApplyDescription } = renderEmphasisHook();

    await act(async () => {
      await result.current.applyEmphasis(ENTRY);
    });

    expect(result.current.stateFor('ie-1').canUndo).toBe(true);

    act(() => {
      result.current.undo('ie-1');
    });

    expect(onApplyDescription).toHaveBeenLastCalledWith('ie-1', SOURCE);
    expect(result.current.stateFor('ie-1').canUndo).toBe(false);
  });

  it('says nothing deserved emphasis when the response matches the source', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: SOURCE });
    const { result, onApplyDescription } = renderEmphasisHook();

    await act(async () => {
      await result.current.applyEmphasis(ENTRY);
    });

    expect(onApplyDescription).not.toHaveBeenCalled();
    expect(result.current.stateFor('ie-1').noticeMessage).toBe(
      '강조할 곳을 찾지 못했어요.',
    );
    expect(result.current.stateFor('ie-1').canUndo).toBe(false);
  });

  it('shows the server error and leaves the text alone', async () => {
    postInformationEmphasisAiRequest.mockRejectedValue(
      new Error('AI 응답이 원문을 바꿔 적용하지 않았습니다.'),
    );
    const { result, onApplyDescription } = renderEmphasisHook();

    await act(async () => {
      await result.current.applyEmphasis(ENTRY);
    });

    expect(onApplyDescription).not.toHaveBeenCalled();
    expect(result.current.stateFor('ie-1').errorMessage).toBe(
      'AI 응답이 원문을 바꿔 적용하지 않았습니다.',
    );
  });

  it('marks only the row being worked on as pending', async () => {
    let release;
    postInformationEmphasisAiRequest.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({ description: MARKED });
      }),
    );
    const { result } = renderEmphasisHook();

    act(() => {
      result.current.applyEmphasis(ENTRY);
    });

    await waitFor(() => {
      expect(result.current.stateFor('ie-1').isPending).toBe(true);
    });
    expect(result.current.stateFor('ie-2').isPending).toBe(false);

    await act(async () => {
      release();
    });

    expect(result.current.stateFor('ie-1').isPending).toBe(false);
  });

  it('drops the undo offer once the seller edits that description again', async () => {
    postInformationEmphasisAiRequest.mockResolvedValue({ description: MARKED });
    const { result } = renderEmphasisHook();

    await act(async () => {
      await result.current.applyEmphasis(ENTRY);
    });

    act(() => {
      result.current.forget('ie-1');
    });

    expect(result.current.stateFor('ie-1').canUndo).toBe(false);
    expect(result.current.stateFor('ie-1').noticeMessage).toBe('');
  });

  it('keeps one row error from leaking into another row', async () => {
    postInformationEmphasisAiRequest.mockRejectedValue(new Error('서버 오류'));
    const { result } = renderEmphasisHook();

    await act(async () => {
      await result.current.applyEmphasis(ENTRY);
    });

    expect(result.current.stateFor('ie-1').errorMessage).toBe('서버 오류');
    expect(result.current.stateFor('ie-2').errorMessage).toBe('');
  });
});
