import { toTrimmedString } from '../../../../../common/utils/text';
import {
  PAGE_STYLE_AI_OPENAI_MAX_OUTPUT_TOKENS,
  PAGE_STYLE_AI_OPENAI_RESPONSE_FORMAT_NAME,
  PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS,
} from '../../../config/page-design/pageStyleAiOpenAiConfig';
import { buildPageAiTargetScopeInstruction } from './pageAiDesignModel';
import { PAGE_STYLE_AI_SCHEMA } from '../ai-response/pageStyleAiResponseModel';
import { normalizePageStyle } from '../page-style/pageStyleModel';

export function buildPageStyleOpenAiRequestBody({
  pageAiDesign,
  openAiModel,
  currentPageStyle,
  history = [],
}) {
  const scopeInstruction = buildPageAiTargetScopeInstruction(
    pageAiDesign.targetScope,
  );
  const scopedPrompt = scopeInstruction
    ? `${scopeInstruction}\n사용자 요청:\n${pageAiDesign.prompt}`
    : pageAiDesign.prompt;
  const historyMessages = (Array.isArray(history) ? history : [])
    .map((turn) => ({
      role: turn?.role === 'assistant' ? 'assistant' : 'user',
      content: toTrimmedString(turn?.text),
    }))
    .filter((turn) => turn.content);

  return {
    model: openAiModel,
    input: [
      {
        role: 'system',
        content: PAGE_STYLE_AI_OPENAI_SYSTEM_INSTRUCTIONS.join('\n'),
      },
      ...historyMessages,
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: {
              ...pageAiDesign,
              scopeInstruction,
              scopedPrompt,
            },
            currentPageStyle: normalizePageStyle(currentPageStyle),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: PAGE_STYLE_AI_OPENAI_RESPONSE_FORMAT_NAME,
        strict: true,
        schema: PAGE_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: PAGE_STYLE_AI_OPENAI_MAX_OUTPUT_TOKENS,
  };
}
