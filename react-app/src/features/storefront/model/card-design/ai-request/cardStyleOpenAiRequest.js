import { toTrimmedString } from '../../../../../common/utils/text';
import { buildCardAiTargetScopeInstruction } from './cardAiDesignModel';
import { CARD_STYLE_AI_SCHEMA } from '../ai-response/cardStyleAiResponseSchema';
import { normalizeCardStyle } from '../style/cardStyleModel';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../../../services/card-design/cardStyleSkillPromptService';

const CARD_STYLE_AI_OPENAI_RESPONSE_FORMAT_NAME = 'storefront_card_style_suggestion';
const CARD_STYLE_AI_OPENAI_MAX_OUTPUT_TOKENS = 900;

export function buildCardStyleOpenAiRequestBody({
  cardAiDesign,
  visibleFields,
  productCategoryName,
  conditionFieldValueSamples,
  openAiModel,
  currentCardStyle,
  history = [],
}) {
  const activeSkillIds = selectCardStyleSkillPackIds({
    productCategoryName,
    mode: 'preview',
  });
  const scopeInstruction = buildCardAiTargetScopeInstruction(
    cardAiDesign.targetScope,
  );
  const scopedPrompt = scopeInstruction
    ? `${scopeInstruction}\n사용자 요청:\n${cardAiDesign.prompt}`
    : cardAiDesign.prompt;
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
        content: buildCardStyleAiSystemPrompt(activeSkillIds),
      },
      ...historyMessages,
      {
        role: 'user',
        content: JSON.stringify(
          {
            request: { ...cardAiDesign, scopeInstruction, scopedPrompt },
            visibleFields,
            conditionFieldValueSamples: conditionFieldValueSamples ?? {},
            currentCardStyle: normalizeCardStyle(currentCardStyle),
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: CARD_STYLE_AI_OPENAI_RESPONSE_FORMAT_NAME,
        strict: true,
        schema: CARD_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: CARD_STYLE_AI_OPENAI_MAX_OUTPUT_TOKENS,
  };
}
