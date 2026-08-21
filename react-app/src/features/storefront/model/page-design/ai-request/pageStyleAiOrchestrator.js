import { toTrimmedString } from '../../../../../common/utils/text';
import { normalizePageAiDesignInput } from './pageAiDesignModel';
import { normalizePageStyleAiIntent } from '../ai-response/pageStyleAiResponseModel';
import { normalizePageStyle } from '../page-style/pageStyleModel';
import { postPageStyleAiRequest } from '../../../services/page-design/pageStyleAiGateway';

const PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE = '요청하신 내용을 페이지 스타일에 반영했습니다.';

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
    explanation:
      toTrimmedString(body?.explanation) ||
      PAGE_STYLE_AI_DEFAULT_EXPLANATION_MESSAGE,
    suggestion: toTrimmedString(body?.suggestion) || null,
  };
}
