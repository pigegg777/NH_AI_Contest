import { describe, expect, it } from 'vitest';
import {
  buildCardStyleAiSystemPrompt,
  selectCardStyleSkillPackIds,
} from '../services/card-design/cardStyleSkillPromptService';
import { buildCardStyleOpenAiRequestBody } from '../model/card-design/ai-request/cardStyleOpenAiRequest';
import { CARD_STYLE_AI_SCHEMA } from '../model/card-design/ai-response/cardStyleAiResponseSchema';
import { normalizeOpenAiCardIntent } from '../model/card-design/ai-response/cardStyleAiResponseNormalizer';
import { compileCardStyle } from '../model/card-design/cardStyleCompiler';
import { DEFAULT_CARD_STYLE } from '../../storefront-view/model/card-style/cardStyleModel';

// The card-design system prompt used to live in two places: the skill packs and a
// second inline array inside the request builder. The inline array was absorbed into
// the references, so these assertions pin the instructions that moved. If one goes
// missing the AI silently loses a rule, which is very hard to spot from the output.
const ABSORBED_INSTRUCTIONS = [
  // output contract: JSON + patch semantics
  'Return only a valid JSON object that matches the schema',
  'incremental patch over',
  'Preserve earlier card edits unless the user explicitly changes them',
  'return `null`',
  // output contract: explanation + suggestion
  '1-2 short Korean sentences',
  'Never\nsuggest changes outside this card',
  // scope model: target scope restriction
  'only that scope',
  'may be set regardless of the target scope',
  // conditional style rules
  'conditionFieldValueSamples',
  '`equals` or `contains`',
  'Never put `cardsPerRow`, field order, or grouping changes inside a',
  'Do not guess or substitute a different tier',
  'Apply the rule only once the user confirms in a later message',
  "re-derive `conditionField` and `conditionValue` from the user's CURRENT",
];

const CATEGORY_TIER_TERMS = ['large_category', '대분류', 'medium_category', '중분류', 'small_category', '소분류', 'detail_category', '세부분류'];

describe('card style AI system prompt', () => {
  const systemPrompt = buildCardStyleAiSystemPrompt(
    selectCardStyleSkillPackIds({ productCategoryName: '비료', mode: 'preview' }),
  );

  it.each(ABSORBED_INSTRUCTIONS)('still carries the instruction %j', (fragment) => {
    expect(systemPrompt).toContain(fragment);
  });

  it.each(CATEGORY_TIER_TERMS)('names the category tier %s', (term) => {
    expect(systemPrompt).toContain(term);
  });

  it('carries no mojibake', () => {
    expect(systemPrompt).not.toMatch(/\?[가-힣]/);
  });

  // cardsPerRow is a user-only control. The layout skill pack used to invite the AI
  // to set it, contradicting the skill's own non-negotiable rule in the same prompt.
  it('leaves cardsPerRow to the user without contradicting itself', () => {
    expect(systemPrompt).toContain(
      '`cardsPerRow` is user-controlled only — never propose a value for it.',
    );
    expect(systemPrompt).not.toMatch(/may set cardsPerRow/i);
  });

  it('does not offer cardsPerRow in the response schema', () => {
    const layoutSchema = CARD_STYLE_AI_SCHEMA.properties.layout;

    expect(layoutSchema.properties).not.toHaveProperty('cardsPerRow');
    expect(layoutSchema.required).not.toContain('cardsPerRow');
  });

  it('drops cardsPerRow from a response that sends it anyway', () => {
    const intent = normalizeOpenAiCardIntent(
      { layout: { cardsPerRow: 2, contentDensity: 'compact' } },
      '',
    );

    expect(intent.layout).not.toHaveProperty('cardsPerRow');
    expect(intent.layout.contentDensity).toBe('compact');
  });

  it('keeps the builder cardsPerRow when an intent tries to override it', () => {
    const { cardStyle } = compileCardStyle({
      intent: { layout: { cardsPerRow: 2, contentDensity: 'compact' } },
      previousCardStyle: { ...DEFAULT_CARD_STYLE, cardsPerRow: 1 },
      previousBodySlots: [],
      cardsPerRow: 1,
      visibleFields: ['product_name'],
      fieldLabels: { product_name: '상품명' },
    });

    expect(cardStyle.cardsPerRow).toBe(1);
  });

  it('is the only system message the request body sends', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: '제목을 굵게 해줘', targetScope: 'header' },
      visibleFields: ['product_name'],
      productCategoryName: '비료',
      conditionFieldValueSamples: {},
      openAiModel: 'gpt-test',
      currentCardStyle: DEFAULT_CARD_STYLE,
    });
    const systemMessages = requestBody.input.filter((turn) => turn.role === 'system');

    expect(systemMessages).toHaveLength(1);
    expect(systemMessages[0].content).toBe(systemPrompt);
  });

  it('labels the user request in Korean without corruption', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: '제목을 굵게 해줘', targetScope: 'header' },
      visibleFields: ['product_name'],
      productCategoryName: '',
      conditionFieldValueSamples: {},
      openAiModel: 'gpt-test',
      currentCardStyle: DEFAULT_CARD_STYLE,
    });
    const userMessage = requestBody.input.find((turn) => turn.role === 'user');

    expect(userMessage.content).toContain('사용자 요청:');
  });
});
