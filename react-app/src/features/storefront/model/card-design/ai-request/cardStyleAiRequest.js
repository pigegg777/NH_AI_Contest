import { toTrimmedString } from '../../../../../common/utils/text';
import { buildCardAiTargetScopeInstruction } from './cardAiDesignModel';
import { CARD_STYLE_AI_SCHEMA } from '../ai-response/cardStyleAiResponseSchema';
import {
  CARD_LAYOUT_CONTENT_DENSITY_OPTIONS,
  CARD_LAYOUT_EMPHASIS_OPTIONS,
  CARD_LAYOUT_GROUPING_HINT_OPTIONS,
  CARD_LAYOUT_IMAGE_PLACEMENT_OPTIONS,
  CARD_LAYOUT_SECTION_OPTIONS,
} from '../style/cardLayoutPlanModel';
import {
  CARD_CONDITION_FIELD_OPTIONS,
  CARD_CONDITION_OPERATOR_OPTIONS,
  CARD_FIELD_COLOR_ROLE_OPTIONS,
  CARD_FIELD_EMPHASIS_OPTIONS,
  CARD_FIELD_FONT_SIZE_OPTIONS,
  CARD_FIELD_FONT_WEIGHT_OPTIONS,
  CARD_IMAGE_FIT_OPTIONS,
  CARD_RADIUS_OPTIONS,
  CARD_SHADOW_OPTIONS,
  CARD_SPACING_OPTIONS,
  normalizeCardStyle,
  normalizeConditionalStyleRules,
} from '../style/cardStyleModel';
import {
  CARD_STRUCTURAL_PRESETS,
  CARD_TITLE_MODE_OPTIONS,
} from '../style/cardCompositionModel';
import { isHexColor, normalizeHexColor } from '../../shared/pageStyleColor';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../../../services/card-design/cardStyleSkillPromptService';

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
    ? `${scopeInstruction}\n?ъ슜???붿껌:\n${cardAiDesign.prompt}`
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
        content: [
          buildCardStyleAiSystemPrompt(activeSkillIds),
          'Return only a valid JSON object that matches the schema.',
          'Treat the response as an incremental patch over currentCardStyle.',
          'Preserve earlier card edits unless the user explicitly changes them.',
          'For every nested property you do not want to change, return null.',
          'If a target scope is given, only that scope (header/image/info/field) may be non-null. All other area objects must be null.',
          'shell, structuralPresetRequest, titleModeRequest, and conditionalStyles are general and may be set regardless of the target scope.',
          'Use "conditionalStyles" only when the user asks for a style that should apply only to products matching a data condition (e.g. "?뚮텇瑜섍? 醫낆옄??寃껋? 諛곌꼍 ?곕몢?됱쑝濡??댁쨾"). Each rule needs conditionField (an actual product data field), conditionOperator (equals/contains), conditionValue, and only the cosmetic style overrides (shell/header/image/info/field) that were requested ??leave everything else null. Never put cardsPerRow, field order, or grouping changes inside a conditionalStyles rule; those stay uniform across the whole section.',
          'This product catalog has FOUR separate category tiers, each a distinct field: large_category = ?遺꾨쪟, medium_category = 以묐텇瑜? small_category = ?뚮텇瑜? detail_category = ?몃?遺꾨쪟/?몃? 遺꾨쪟. When the user names one of these Korean terms, use the exact matching field key ??do not guess or substitute a different tier.',
          'The user message JSON includes "conditionFieldValueSamples": real distinct values actually present in this office\'s current product data, grouped by field. Before choosing conditionField/conditionValue for a conditionalStyles rule, check this object first: find which field\'s sample values actually contain or match what the user described, and use that field with a conditionValue drawn from (or closely matching) the real samples. Do not guess a field based on its name alone if the samples disagree ??e.g. detail_category\'s samples being crop types like 梨꾩냼瑜?means it is the wrong field for a product-type request like 醫낆옄, even if "detail" sounds like it could be "?뚮텇瑜?.',
          'If, after checking conditionFieldValueSamples, you are NOT confident which field/value the user means ??e.g. the word appears in more than one field\'s samples, or it does not clearly match any sample and you would be guessing ??do NOT apply a conditionalStyles rule on that guess. Instead set conditionalStyles to null (or omit that rule, keep any other unrelated changes), and use "explanation" to ask the user a short Korean confirmation question naming the specific candidate field(s)/value(s) you found (e.g. "\'醫낆옄\'媛 以묐텇瑜?醫낆옄醫낅쵖)瑜?留먯??섏떆??嫄멸퉴?? ?꾨땲硫??ㅻⅨ 遺꾨쪟?멸??? ?뺤씤?댁＜?쒕㈃ 諛붾줈 ?곸슜?좉쾶??"). Only apply the rule once the user confirms in a later message.',
          'Always re-derive conditionField and conditionValue from the user\'s CURRENT message. Do not reuse a conditionField from a previous turn just because the conversation is continuing ??if the user restates or corrects the category tier, treat it as the source of truth even if it contradicts an earlier conditionalStyles rule.',
          'Always set "explanation" to 1-2 short Korean sentences describing what you changed, written for a non-technical store owner.',
          'If a clear complementary tweak exists for another section of this same card (header/image/info/field), set "suggestion" to one short Korean sentence describing it. Otherwise set "suggestion" to null. Never suggest changes outside this card.',
        ].join('\n\n'),
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
        name: 'storefront_card_style_suggestion',
        strict: true,
        schema: CARD_STYLE_AI_SCHEMA,
      },
    },
    max_output_tokens: 900,
  };
}

