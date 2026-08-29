import { toTrimmedString } from '../../../../../common/utils/text';
import { normalizeCardAiDesignInput } from './cardAiDesignModel';
import { normalizeCardStyle } from '../../../../storefront-view/model/card-design/style/cardStyleModel';
import {
  normalizeOpenAiCardExplanation,
  normalizeOpenAiCardIntent,
} from '../ai-response/cardStyleAiResponseNormalizer';
import { postCardStyleAiRequest } from '../../../services/card-design/cardStyleAiGateway';

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
    ...normalizeOpenAiCardExplanation(body),
  };
}
