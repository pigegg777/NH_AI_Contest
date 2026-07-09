import { toTrimmedString } from '../../../../common/utils/text';
import { normalizeCardAiDesignInput } from './cardAiDesignModel';
import { normalizeCardStyle } from './cardStyleModel';
import { normalizeOpenAiCardIntent } from './cardStyleAiContract';
import { postCardStyleAiRequest } from '../../services/card-design/cardStyleAiGateway';

const DEFAULT_EXPLANATION_MESSAGE = '요청하신 내용을 카드 디자인에 반영했습니다.';

export async function requestCardStyleAiIntent({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  conditionFieldValueSamples,
  currentCardStyle,
  officeCode,
  history,
} = {}) {
  const normalizedInput = normalizeCardAiDesignInput(cardAiDesign);
  const normalizedVisibleFields = Array.isArray(visibleFields) ? visibleFields : [];
  const normalizedHistory = Array.isArray(history) ? history : [];

  const body = await postCardStyleAiRequest({
    officeCode: toTrimmedString(officeCode),
    cardAiDesign: normalizedInput,
    visibleFields: normalizedVisibleFields,
    productCategoryName: toTrimmedString(productCategoryName),
    conditionFieldValueSamples: conditionFieldValueSamples ?? {},
    currentCardStyle: normalizeCardStyle(currentCardStyle),
    history: normalizedHistory,
  });

  return {
    intent: normalizeOpenAiCardIntent(body?.intent, normalizedInput.targetScope),
    explanation: toTrimmedString(body?.explanation) || DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(body?.suggestion) || null,
  };
}
