import { useRef, useState } from 'react';

import {
  CARD_STRUCTURAL_PRESETS,
  normalizeCardsPerRow,
  resolveStructuralPreset,
} from '../../storefront-view/model/card-style/cardCompositionModel';
import { deriveLegacyCardLayoutPlan } from '../../storefront-view/model/card-style/cardLayoutPlanModel';
import {
  DEFAULT_CARD_AI_DESIGN,
  normalizeCardAiDesignInput,
  normalizeCardAiTargetScope,
} from '../model/card-design/ai-request/cardAiDesignModel';
import { collectConditionFieldValueSamples, normalizeCardStyle } from '../../storefront-view/model/card-style/cardStyleModel';
import { requestCardStyleAiIntent } from '../model/card-design/ai-request/cardStyleAiOrchestrator';
import { compileCardStyle } from '../model/card-design/cardStyleCompiler';

const MISSING_CARD_PROMPT_ERROR_MESSAGE = '카드 디자인 요청을 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '카드 디자인을 적용하지 못했습니다.';
const MAX_CARD_AI_HISTORY_TURNS = 6;

export function useCardAiDesign({ officeCode, initialCardStyle, initialBodySlots = [] } = {}) {
  const [cardStyle, setCardStyle] = useState(() => normalizeCardStyle(initialCardStyle));
  const [bodySlots, setBodySlots] = useState(initialBodySlots);
  const [cardAiDesign, setCardAiDesignState] = useState(DEFAULT_CARD_AI_DESIGN);
  const [cardAiMessages, setCardAiMessages] = useState([]);
  const [isApplyingCardAiDesign, setIsApplyingCardAiDesign] = useState(false);
  const [cardAiErrorMessage, setCardAiErrorMessage] = useState('');
  const [cardAiWarningMessage, setCardAiWarningMessage] = useState('');
  const [lastCardAiSnapshot, setLastCardAiSnapshot] = useState(null);
  const messageIdRef = useRef(0);

  function nextMessageId() {
    messageIdRef.current += 1;
    return `card-ai-message-${messageIdRef.current}`;
  }

  function hydrateCardStyle(nextCardStyle, nextBodySlots = []) {
    setCardStyle(normalizeCardStyle(nextCardStyle));
    setBodySlots(nextBodySlots);
    setCardAiDesignState(DEFAULT_CARD_AI_DESIGN);
    setCardAiMessages([]);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');
    setLastCardAiSnapshot(null);
  }

  function setPrompt(value) {
    setCardAiDesignState((current) => ({ ...current, prompt: value }));
  }

  function setTargetScope(targetScope) {
    setCardAiDesignState((current) => ({
      ...current,
      targetScope: normalizeCardAiTargetScope(targetScope),
    }));
  }

  function setCardsPerRow(value) {
    setCardStyle((current) => {
      const nextCardsPerRow = normalizeCardsPerRow(value, current.cardsPerRow);
      const nextStructuralPreset = resolveStructuralPreset(
        current.structuralPreset,
        nextCardsPerRow,
      );

      return normalizeCardStyle({
        ...current,
        cardsPerRow: nextCardsPerRow,
        structuralPreset: nextStructuralPreset,
        // When the new card count makes the current preset ineligible, the plan has
        // to be rebuilt too — carrying the old one over would keep rendering a
        // side-by-side card the preset no longer allows.
        layoutPlan:
          nextStructuralPreset === current.structuralPreset
            ? { ...current.layoutPlan, cardsPerRow: nextCardsPerRow }
            : deriveLegacyCardLayoutPlan({
                cardsPerRow: nextCardsPerRow,
                structuralPreset: nextStructuralPreset,
                titleMode: current.titleMode,
                info: current.info,
              }),
      });
    });
  }

  function setStructuralPreset(value) {
    setCardStyle((current) => {
      const requestedPreset = CARD_STRUCTURAL_PRESETS[value];
      // Side-by-side layouts need a full-width card. Rather than refusing the
      // pick, move the card count to one so the chosen layout actually applies.
      const nextCardsPerRow =
        requestedPreset &&
        !requestedPreset.allowedCardsPerRow.includes(current.cardsPerRow)
          ? requestedPreset.allowedCardsPerRow[0]
          : current.cardsPerRow;
      const nextStructuralPreset = resolveStructuralPreset(value, nextCardsPerRow);
      // The split layout puts the title in its own full-width row, so an inline
      // title would leave that row empty and repeat the name inside the info area.
      const nextTitleMode =
        nextStructuralPreset === 'header-split' ? 'header' : current.titleMode;

      return normalizeCardStyle({
        ...current,
        cardsPerRow: nextCardsPerRow,
        structuralPreset: nextStructuralPreset,
        titleMode: nextTitleMode,
        layoutPlan: deriveLegacyCardLayoutPlan({
          cardsPerRow: nextCardsPerRow,
          structuralPreset: nextStructuralPreset,
          titleMode: nextTitleMode,
          info: current.info,
        }),
      });
    });
  }

  async function applyCardAiDesign({
    visibleFields,
    fieldLabels,
    productCategoryName,
    productRows,
    prompt,
    targetScope,
    history: externalHistory,
  } = {}) {
    const normalizedInput = normalizeCardAiDesignInput({
      ...cardAiDesign,
      prompt: prompt ?? cardAiDesign.prompt,
      targetScope: targetScope ?? cardAiDesign.targetScope,
    });

    if (!normalizedInput.prompt) {
      setCardAiErrorMessage(MISSING_CARD_PROMPT_ERROR_MESSAGE);
      return {
        ok: false,
        error: MISSING_CARD_PROMPT_ERROR_MESSAGE,
      };
    }

    const history = Array.isArray(externalHistory)
      ? externalHistory
      : cardAiMessages
          .slice(-MAX_CARD_AI_HISTORY_TURNS)
          .map((message) => ({ role: message.role, text: message.text }));

    setCardAiMessages((current) => [
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
    setIsApplyingCardAiDesign(true);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');

    try {
      const conditionFieldValueSamples = collectConditionFieldValueSamples(productRows);
      const { intent, explanation, suggestion } = await requestCardStyleAiIntent({
        cardAiDesign: normalizedInput,
        visibleFields,
        productCategoryName,
        conditionFieldValueSamples,
        currentCardStyle: cardStyle,
        officeCode,
        history,
      });
      const result = compileCardStyle({
        intent,
        previousCardStyle: cardStyle,
        previousBodySlots: bodySlots,
        cardsPerRow: cardStyle.cardsPerRow,
        visibleFields,
        fieldLabels,
      });

      setLastCardAiSnapshot({ cardStyle, bodySlots });
      setCardStyle(result.cardStyle);
      setBodySlots(result.bodySlots);
      setCardAiWarningMessage(result.warning);
      setCardAiMessages((current) => [
        ...current,
        {
          id: nextMessageId(),
          role: 'assistant',
          text: explanation,
          suggestion,
          scope: normalizedInput.targetScope,
          ts: Date.now(),
          warningMessage: result.warning,
        },
      ]);

      return {
        ok: true,
        explanation,
        suggestion,
        scope: normalizedInput.targetScope,
        warningMessage: result.warning,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE;

      setCardAiErrorMessage(message);

      return {
        ok: false,
        error: message,
      };
    } finally {
      setIsApplyingCardAiDesign(false);
    }
  }

  function undoLastCardAiDesign() {
    if (!lastCardAiSnapshot) {
      return;
    }

    setCardStyle(lastCardAiSnapshot.cardStyle);
    setBodySlots(lastCardAiSnapshot.bodySlots);
    setCardAiWarningMessage('');
    setLastCardAiSnapshot(null);
  }

  function discardCardAiDesignSession() {
    setCardAiDesignState(DEFAULT_CARD_AI_DESIGN);
    setCardAiMessages([]);
  }

  return {
    cardStyle,
    bodySlots,
    cardAiDesign,
    cardAiMessages,
    isApplyingCardAiDesign,
    cardAiErrorMessage,
    canUndoCardAiDesign: Boolean(lastCardAiSnapshot),
    hydrateCardStyle,
    setCardsPerRow,
    setStructuralPreset,
    setPrompt,
    setTargetScope,
    applyCardAiDesign,
    undoLastCardAiDesign,
    discardCardAiDesignSession,
  };
}
