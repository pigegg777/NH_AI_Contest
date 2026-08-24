import { toTrimmedString } from '../../../../../common/utils/text';
import { normalizePageAiDesignInput } from './pageAiDesignModel';
import {
  normalizePageStyleAiExplanation,
  normalizePageStyleAiIntent,
} from '../ai-response/pageStyleAiResponseNormalizer';
import { normalizePageStyle } from '../style/pageStyleModel';
import { postPageStyleAiRequest } from '../../../services/page-design/pageStyleAiGateway';

export async function requestPageStyleAiIntent({
  pageAiDesign,
  currentPageStyle,
  officeCode,
  history,
} = {}) {
  const normalizedInput = normalizePageAiDesignInput(pageAiDesign);
  const resolvedCurrentPageStyle = normalizePageStyle(currentPageStyle);
  const normalizedHistory = Array.isArray(history) ? history : [];

  const body = await postPageStyleAiRequest({
    officeCode: toTrimmedString(officeCode),
    pageAiDesign: normalizedInput,
    currentPageStyle: resolvedCurrentPageStyle,
    history: normalizedHistory,
  });

  return {
    intent: normalizePageStyleAiIntent(
      body?.intent,
      resolvedCurrentPageStyle.palette.accentHex,
      normalizedInput.targetScope,
    ),
    ...normalizePageStyleAiExplanation(body),
  };
}
