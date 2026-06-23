import { useState } from 'react';

import { normalizeCardsPerRow, resolveStructuralPreset } from '../model/cardCompositionModel';
import {
  DEFAULT_CARD_AI_DESIGN,
  normalizeCardAiDesignInput,
  normalizeCardAiTargetScope,
} from '../model/cardAiDesignModel';
import { normalizeCardStyle } from '../model/cardStyleModel';
import { requestCardStyleAiIntent } from '../services/cardStyleAiGateway';
import { compileCardStyle } from '../services/cardStyleCompiler';

const MISSING_CARD_PROMPT_ERROR_MESSAGE = '카드 디자인 요청을 먼저 입력해 주세요.';
const APPLY_FAILED_ERROR_MESSAGE = '카드 디자인을 적용하지 못했습니다.';

export function useCardAiDesign({ officeCode, initialCardStyle, initialBodySlots = [] } = {}) {
  const [cardStyle, setCardStyle] = useState(() => normalizeCardStyle(initialCardStyle));
  const [bodySlots, setBodySlots] = useState(initialBodySlots);
  const [cardAiDesign, setCardAiDesignState] = useState(DEFAULT_CARD_AI_DESIGN);
  const [isApplyingCardAiDesign, setIsApplyingCardAiDesign] = useState(false);
  const [cardAiErrorMessage, setCardAiErrorMessage] = useState('');
  const [cardAiWarningMessage, setCardAiWarningMessage] = useState('');
  const [lastCardAiSnapshot, setLastCardAiSnapshot] = useState(null);

  function hydrateCardStyle(nextCardStyle, nextBodySlots = []) {
    setCardStyle(normalizeCardStyle(nextCardStyle));
    setBodySlots(nextBodySlots);
    setCardAiDesignState(DEFAULT_CARD_AI_DESIGN);
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

      return normalizeCardStyle({
        ...current,
        cardsPerRow: nextCardsPerRow,
        structuralPreset: resolveStructuralPreset(current.structuralPreset, nextCardsPerRow),
        layoutPlan: {
          ...current.layoutPlan,
          cardsPerRow: nextCardsPerRow,
        },
      });
    });
  }

  async function applyCardAiDesign({ visibleFields, fieldLabels, productCategoryName } = {}) {
    const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);

    if (!normalizedInput.prompt) {
      setCardAiErrorMessage(MISSING_CARD_PROMPT_ERROR_MESSAGE);
      return;
    }

    setIsApplyingCardAiDesign(true);
    setCardAiErrorMessage('');
    setCardAiWarningMessage('');

    try {
      const intent = await requestCardStyleAiIntent({
        cardAiDesign: normalizedInput,
        visibleFields,
        productCategoryName,
        currentCardStyle: cardStyle,
        officeCode,
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
    } catch (error) {
      setCardAiErrorMessage(error instanceof Error ? error.message : APPLY_FAILED_ERROR_MESSAGE);
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
  }

  return {
    cardStyle,
    bodySlots,
    cardAiDesign,
    isApplyingCardAiDesign,
    cardAiErrorMessage,
    cardAiWarningMessage,
    canUndoCardAiDesign: Boolean(lastCardAiSnapshot),
    hydrateCardStyle,
    setCardsPerRow,
    setPrompt,
    setTargetScope,
    applyCardAiDesign,
    undoLastCardAiDesign,
    discardCardAiDesignSession,
  };
}
