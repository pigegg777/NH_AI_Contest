import { useRef, useState } from 'react';

import {
  DEFAULT_PAGE_AI_DESIGN,
  normalizePageAiDesignInput,
  normalizePageAiTargetScope,
} from '../model/page-design/pageAiDesignModel';
import { normalizePageStyle } from '../model/page-design/pageStyleModel';
import { requestPageStyleAiIntent } from '../services/page-design/pageStyleAiGateway';
import { compilePageStyle } from '../services/page-design/pageStyleCompiler';

const MISSING_PAGE_PROMPT_ERROR_MESSAGE = '페이지 분위기를 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '페이지 스타일을 적용하지 못했습니다.';
const MAX_PAGE_AI_HISTORY_TURNS = 6;

export function usePageAiDesign({ officeCode, initialPageStyle } = {}) {
  const [pageStyle, setPageStyle] = useState(() =>
    normalizePageStyle(initialPageStyle),
  );
  const [pageAiDesign, setPageAiDesignState] =
    useState(DEFAULT_PAGE_AI_DESIGN);
  const [pageAiMessages, setPageAiMessages] = useState([]);
  const [isApplyingPageAiDesign, setIsApplyingPageAiDesign] = useState(false);
  const [pageAiErrorMessage, setPageAiErrorMessage] = useState('');
  const messageIdRef = useRef(0);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `page-ai-message-${messageIdRef.current}`;
  }

  function hydratePageStyle(nextPageStyle) {
    setPageStyle(normalizePageStyle(nextPageStyle));
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
    setPageAiMessages([]);
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

  async function applyPageAiDesign(overrides = {}) {
    const normalizedInput = normalizePageAiDesignInput({
      ...pageAiDesign,
      prompt: overrides.prompt ?? pageAiDesign.prompt,
      targetScope: overrides.targetScope ?? pageAiDesign.targetScope,
    });

    if (!normalizedInput.prompt) {
      setPageAiErrorMessage(MISSING_PAGE_PROMPT_ERROR_MESSAGE);
      return {
        ok: false,
        error: MISSING_PAGE_PROMPT_ERROR_MESSAGE,
      };
    }

    const history = Array.isArray(overrides.history)
      ? overrides.history
      : pageAiMessages
          .slice(-MAX_PAGE_AI_HISTORY_TURNS)
          .map((message) => ({ role: message.role, text: message.text }));

    setPageAiMessages((current) => [
      ...current,
      {
        id: nextMessageId(),
        role: 'user',
        text: normalizedInput.prompt,
        scope: normalizedInput.targetScope,
        ts: Date.now(),
      },
    ]);
    setPrompt('');
    setIsApplyingPageAiDesign(true);
    setPageAiErrorMessage('');

    try {
      const { intent, explanation, suggestion } = await requestPageStyleAiIntent({
        pageAiDesign: normalizedInput,
        currentPageStyle: pageStyle,
        officeCode,
        history,
      });
      const nextPageStyle = compilePageStyle({
        intent,
        previousPageStyle: pageStyle,
        targetScope: normalizedInput.targetScope,
      });

      setPageStyle(nextPageStyle);
      setPageAiMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: explanation,
          suggestion,
          scope: normalizedInput.targetScope,
          ts: Date.now(),
        },
      ]);

      return {
        ok: true,
        explanation,
        suggestion,
        scope: normalizedInput.targetScope,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE;

      setPageAiErrorMessage(message);

      return {
        ok: false,
        error: message,
      };
    } finally {
      setIsApplyingPageAiDesign(false);
    }
  }

  function discardPageAiDesignSession() {
    setPageAiDesignState(DEFAULT_PAGE_AI_DESIGN);
    setPageAiMessages([]);
  }

  return {
    pageStyle,
    pageAiDesign,
    pageAiMessages,
    isApplyingPageAiDesign,
    pageAiErrorMessage,
    hydratePageStyle,
    setPrompt,
    setTargetScope,
    applyPageAiDesign,
    discardPageAiDesignSession,
  };
}
