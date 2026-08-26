import { useState } from 'react';

import { postInformationEmphasisAiRequest } from '../services/information-emphasis/informationEmphasisAiGateway';

const EMPTY_ROW_STATE = {
  isPending: false,
  errorMessage: '',
  noticeMessage: '',
  previousDescription: null,
};

export const EMPHASIS_APPLIED_NOTICE = 'AI가 강조를 넣었습니다.';
export const NOTHING_TO_EMPHASIZE_NOTICE = '강조할 곳을 찾지 못했어요.';
const UNKNOWN_FAILURE_ERROR_MESSAGE = '강조를 넣지 못했습니다.';

/**
 * 안내 항목 행마다 따로 도는 AI 강조 상태. 행 하나짜리 상태로 만들지 않은 이유는
 * 1번 항목이 도는 중에 3번 항목을 눌렀을 때 스피너와 에러가 섞이기 때문이다.
 * 항목 배열 자체는 이 훅이 들고 있지 않다 — 바꿔야 할 때 onApplyDescription 을
 * 부르고, 그 결과를 화면에 반영하는 일은 항목을 소유한 쪽이 한다.
 */
export function useInformationEmphasisAi({ officeCode, onApplyDescription }) {
  const [rowStates, setRowStates] = useState({});

  function patchRow(entryId, patch) {
    setRowStates((current) => ({
      ...current,
      [entryId]: { ...EMPTY_ROW_STATE, ...current[entryId], ...patch },
    }));
  }

  function stateFor(entryId) {
    const row = rowStates[entryId] ?? EMPTY_ROW_STATE;

    return {
      isPending: row.isPending,
      errorMessage: row.errorMessage,
      noticeMessage: row.noticeMessage,
      canUndo: row.previousDescription !== null,
    };
  }

  async function applyEmphasis(entry) {
    patchRow(entry.id, {
      isPending: true,
      errorMessage: '',
      noticeMessage: '',
      previousDescription: null,
    });

    try {
      const { description } = await postInformationEmphasisAiRequest({
        officeCode,
        label: entry.label,
        description: entry.description,
      });

      // 글자가 그대로면 되돌릴 것도 없다. 스냅샷을 남기면 아무것도 안 하는
      // 되돌리기 버튼이 생긴다.
      if (description === entry.description) {
        patchRow(entry.id, {
          isPending: false,
          noticeMessage: NOTHING_TO_EMPHASIZE_NOTICE,
        });

        return;
      }

      onApplyDescription(entry.id, description);
      patchRow(entry.id, {
        isPending: false,
        noticeMessage: EMPHASIS_APPLIED_NOTICE,
        previousDescription: entry.description,
      });
    } catch (error) {
      patchRow(entry.id, {
        isPending: false,
        errorMessage:
          error instanceof Error && error.message
            ? error.message
            : UNKNOWN_FAILURE_ERROR_MESSAGE,
      });
    }
  }

  function undo(entryId) {
    const previousDescription = rowStates[entryId]?.previousDescription;

    if (typeof previousDescription !== 'string') {
      return;
    }

    onApplyDescription(entryId, previousDescription);
    patchRow(entryId, { noticeMessage: '', previousDescription: null });
  }

  /**
   * 판매자가 그 설명을 다시 건드리면 되돌리기 제안은 사라진다. 스냅샷은 AI를
   * 부르기 직전 원문 하나뿐이라, 그 뒤에 손으로 쓴 줄은 되살릴 방법이 없다.
   * 남겨두면 되돌리기가 판매자가 방금 쓴 글을 날린다.
   */
  function forget(entryId) {
    if (!rowStates[entryId]) {
      return;
    }

    patchRow(entryId, {
      errorMessage: '',
      noticeMessage: '',
      previousDescription: null,
    });
  }

  return { stateFor, applyEmphasis, undo, forget };
}
