import { useState } from 'react';

import {
  DEFAULT_PAGE_AI_DESIGN,
  normalizePageAiDesignInput,
  normalizePageAiTargetScope,
} from '../model/pageAiDesignModel';
import { normalizePageStyle } from '../model/pageStyleModel';
import { interpretPageAiDesign } from '../services/pageStyleAiInterpreter';
import { compilePageStyle } from '../services/pageStyleCompiler';

const MISSING_PAGE_PROMPT_ERROR_MESSAGE = '페이지 분위기를 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '페이지 스타일을 적용하지 못했습니다.';

export function usePageAiDesign({ initialPageStyle } = {}) {
  const [pageStyle, setPageStyle] = useState(() =>
    normalizePageStyle(initialPageStyle),
  );
  const [pageAiDesign, setPageAiDesignState] =
    useState(DEFAULT_PAGE_AI_DESIGN);
  const [isApplyingPageAiDesign, setIsApplyingPageAiDesign] = useState(false);
  const [pageAiErrorMessage, setPageAiErrorMessage] = useState('');

  function hydratePageStyle(nextPageStyle) {
    setPageStyle(normalizePageStyle(nextPageStyle));
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
    setPageAiErrorMessage('');
  }

  function setPrompt(value) {
    setPageAiDesignState((current) => ({
      ...current,
      prompt: value,
    }));
  }

  function setTargetScope(targetScope) {
    setPageAiDesignState((current) => ({
      ...current,
      targetScope: normalizePageAiTargetScope(targetScope),
    }));
  }

  async function applyPageAiDesign() {
    const normalizedInput = normalizePageAiDesignInput(pageAiDesign);

    if (!normalizedInput.prompt) {
      setPageAiErrorMessage(MISSING_PAGE_PROMPT_ERROR_MESSAGE);
      return;
    }

    setIsApplyingPageAiDesign(true);
    setPageAiErrorMessage('');

    try {
      const intent = await interpretPageAiDesign({
        pageAiDesign: normalizedInput,
        currentPageStyle: pageStyle,
      });
      const nextPageStyle = compilePageStyle({
        intent,
        previousPageStyle: pageStyle,
        targetScope: normalizedInput.targetScope,
      });

      setPageStyle(nextPageStyle);
    } catch (error) {
      setPageAiErrorMessage(
        error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE,
      );
    } finally {
      setIsApplyingPageAiDesign(false);
    }
  }

  function discardPageAiDesignSession() {
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
  }

  return {
    pageStyle,
    pageAiDesign,
    isApplyingPageAiDesign,
    pageAiErrorMessage,
    hydratePageStyle,
    setPrompt,
    setTargetScope,
    applyPageAiDesign,
    discardPageAiDesignSession,
  };
}
