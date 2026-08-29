import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCardStyleOpenAiRequestBody } from '../model/card-design/ai-request/cardStyleOpenAiRequest';
import { CARD_STYLE_AI_SCHEMA } from '../model/card-design/ai-response/cardStyleAiResponseSchema';
import {
  normalizeOpenAiCardExplanation,
  normalizeOpenAiCardIntent,
} from '../model/card-design/ai-response/cardStyleAiResponseNormalizer';

function collectStrictModeViolations(schema, path = []) {
  if (!schema || typeof schema !== 'object') return [];

  let violations = [];

  if (schema.type === 'object') {
    const propertyNames = Object.keys(schema.properties ?? {});

    if (schema.additionalProperties !== false) {
      violations.push(
        `${path.join('.') || '<root>'}: additionalProperties must be false`,
      );
    }

    const required = Array.isArray(schema.required) ? schema.required : [];
    const missingRequired = propertyNames.filter(
      (name) => !required.includes(name),
    );

    if (missingRequired.length > 0) {
      violations.push(
        `${path.join('.') || '<root>'}: required must list every property (missing ${missingRequired.join(', ')})`,
      );
    }

    for (const name of propertyNames) {
      violations = violations.concat(
        collectStrictModeViolations(schema.properties[name], [...path, name]),
      );
    }
  }

  if (schema.type === 'array' && schema.items) {
    violations = violations.concat(
      collectStrictModeViolations(schema.items, [...path, '[]']),
    );
  }

  return violations;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe('CARD_STYLE_AI_SCHEMA', () => {
  it('satisfies OpenAI strict structured-output rules at every nesting level', () => {
    expect(collectStrictModeViolations(CARD_STYLE_AI_SCHEMA)).toEqual([]);
  });

  it('exposes layout and requestedGroups in the strict schema', () => {
    expect(CARD_STYLE_AI_SCHEMA.properties.layout).toBeDefined();
    expect(
      CARD_STYLE_AI_SCHEMA.properties.info.properties.requestedGroups,
    ).toBeDefined();
  });

  it('allows nested properties to be null so OpenAI can send incremental patches', () => {
    expect(
      CARD_STYLE_AI_SCHEMA.properties.header.properties.backgroundColor.type,
    ).toContain('null');
    expect(
      CARD_STYLE_AI_SCHEMA.properties.layout.properties.imagePlacement.type,
    ).toContain('null');
    expect(
      CARD_STYLE_AI_SCHEMA.properties.info.properties.requestedFieldOrder.type,
    ).toContain('null');
  });
});

describe('normalizeOpenAiCardIntent', () => {
  it('normalizes a full OpenAI-shaped payload, trimming id/label/field strings in info groups and orders', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        structuralPresetRequest: 'image-left',
        titleModeRequest: 'inline',
        layout: { cardsPerRow: 2, sectionOrder: ['header', 'image'], imagePlacement: null, contentDensity: null, emphasis: null, groupingHint: null },
        shell: { backgroundColor: null, borderColor: null, shadow: 'strong', radius: null, spacing: null },
        header: { backgroundColor: null, titleColorHex: '#111827', fontWeight: null },
        image: null,
        info: {
          backgroundColor: null,
          borderColor: null,
          padding: null,
          radius: null,
          fieldGap: null,
          fieldGroupGap: null,
          requestedGroups: [
            { id: '  price-compare  ', label: '  가격  ', display: 'inline-group', fields: ['  tax_price  ', 'zero_tax_price'] },
          ],
          requestedFieldOrder: ['  tax_price  ', 'product_name'],
        },
        field: null,
      },
      '',
    );

    expect(intent.structuralPresetRequest).toBe('image-left');
    // cardsPerRow is user-only, so it is dropped even when the payload carries it.
    expect(intent.layout).toEqual({ sectionOrder: ['header', 'image'] });
    expect(intent.shell).toEqual({ shadow: 'strong' });
    expect(intent.header).toEqual({ titleColorHex: '#111827' });
    expect(intent.info.requestedGroups).toEqual([
      { id: 'price-compare', label: '가격', display: 'inline-group', fields: ['tax_price', 'zero_tax_price'] },
    ]);
    expect(intent.info.requestedFieldOrder).toEqual(['tax_price', 'product_name']);
  });

  it('drops a requested group with a blank id even if its fields are present', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        structuralPresetRequest: null,
        titleModeRequest: null,
        layout: null,
        shell: null,
        header: null,
        image: null,
        info: {
          backgroundColor: null,
          borderColor: null,
          padding: null,
          radius: null,
          fieldGap: null,
          fieldGroupGap: null,
          requestedGroups: [{ id: '   ', label: 'x', display: 'inline-group', fields: ['tax_price'] }],
          requestedFieldOrder: null,
        },
        field: null,
      },
      '',
    );

    expect(intent.info).toBeNull();
  });

  it('nulls out every non-target area when a targetScope is locked to header', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        structuralPresetRequest: null,
        titleModeRequest: null,
        layout: null,
        shell: null,
        header: { backgroundColor: null, titleColorHex: '#111827', letterSpacing: null, fontWeight: null },
        image: null,
        info: null,
        field: { priceColorRole: 'brand', targetedFieldStyles: null },
      },
      'header',
    );

    expect(intent.header).toEqual({ titleColorHex: '#111827' });
    expect(intent.field).toBeNull();
  });

  it('keeps a valid conditionalStyles rule and survives a locked target scope', () => {
    const payload = {
      structuralPresetRequest: null,
      titleModeRequest: null,
      layout: null,
      shell: null,
      header: null,
      image: null,
      info: null,
      field: null,
      conditionalStyles: [
        {
          conditionField: 'medium_category',
          conditionOperator: 'equals',
          conditionValue: '종자',
          shell: { backgroundColor: '#e6f7d9', borderColor: null, shadow: null, radius: null },
          header: null,
          image: null,
          info: null,
          field: null,
        },
      ],
    };

    const intent = normalizeOpenAiCardIntent(payload, '');
    expect(intent.conditionalStyles).toEqual([
      {
        conditionField: 'medium_category',
        conditionOperator: 'equals',
        conditionValue: '종자',
        shell: { backgroundColor: '#e6f7d9', borderColor: '', shadow: '', radius: '' },
        header: null,
        image: null,
        info: null,
        field: null,
      },
    ]);

    const scopedIntent = normalizeOpenAiCardIntent(payload, 'header');
    expect(scopedIntent.conditionalStyles).toEqual(intent.conditionalStyles);
  });

  it('drops conditionalStyles when the array is empty or every rule is invalid', () => {
    expect(normalizeOpenAiCardIntent({ conditionalStyles: [] }, '').conditionalStyles).toBeNull();
    expect(
      normalizeOpenAiCardIntent(
        { conditionalStyles: [{ conditionField: '', conditionValue: '종자', shell: { backgroundColor: '#e6f7d9' } }] },
        '',
      ).conditionalStyles,
    ).toBeNull();
  });
});

describe('CARD_STYLE_AI_SCHEMA explanation/suggestion fields', () => {
  it('requires explanation as a plain string and suggestion as a nullable string', () => {
    expect(CARD_STYLE_AI_SCHEMA.properties.explanation.type).toBe('string');
    expect(CARD_STYLE_AI_SCHEMA.properties.suggestion.type).toContain('null');
    expect(CARD_STYLE_AI_SCHEMA.required).toContain('explanation');
    expect(CARD_STYLE_AI_SCHEMA.required).toContain('suggestion');
  });
});

describe('normalizeOpenAiCardExplanation', () => {
  it('trims explanation/suggestion and nulls out a blank suggestion', () => {
    expect(
      normalizeOpenAiCardExplanation({ explanation: '  제목을 굵게 바꿨습니다.  ', suggestion: '  ' }),
    ).toEqual({ explanation: '제목을 굵게 바꿨습니다.', suggestion: null });
  });

  it('falls back to a default explanation when the payload omits it', () => {
    expect(normalizeOpenAiCardExplanation({})).toEqual({
      explanation: '요청하신 내용을 카드 디자인에 반영했습니다.',
      suggestion: null,
    });
  });

  it('keeps a real suggestion string', () => {
    expect(
      normalizeOpenAiCardExplanation({ explanation: 'ok', suggestion: '이미지도 함께 밝게 해보세요.' }),
    ).toEqual({ explanation: 'ok', suggestion: '이미지도 함께 밝게 해보세요.' });
  });
});

describe('buildCardStyleOpenAiRequestBody history threading', () => {
  it('splices history turns between the system message and the final user message', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: '더 크게 해줘', targetScope: '' },
      visibleFields: ['product_name'],
      productCategoryName: '',
      openAiModel: 'gpt-4.1-mini',
      currentCardStyle: undefined,
      history: [
        { role: 'user', text: '제목을 굵게 해줘' },
        { role: 'assistant', text: '제목을 더 굵게 바꿨습니다.' },
      ],
    });

    expect(requestBody.input[0].role).toBe('system');
    expect(requestBody.input[1]).toEqual({ role: 'user', content: '제목을 굵게 해줘' });
    expect(requestBody.input[2]).toEqual({ role: 'assistant', content: '제목을 더 굵게 바꿨습니다.' });
    expect(requestBody.input[3].role).toBe('user');
    expect(requestBody.input).toHaveLength(4);
  });

  it('drops blank history turns and defaults to no history when omitted', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: '더 크게 해줘', targetScope: '' },
      visibleFields: ['product_name'],
      productCategoryName: '',
      openAiModel: 'gpt-4.1-mini',
      currentCardStyle: undefined,
      history: [{ role: 'user', text: '   ' }],
    });

    expect(requestBody.input).toHaveLength(2);
  });

  it('mentions explanation and suggestion in the system prompt', () => {
    const requestBody = buildCardStyleOpenAiRequestBody({
      cardAiDesign: { prompt: 'x', targetScope: '' },
      visibleFields: [],
      productCategoryName: '',
      openAiModel: 'gpt-4.1-mini',
      currentCardStyle: undefined,
    });

    expect(requestBody.input[0].content).toContain('explanation');
    expect(requestBody.input[0].content).toContain('suggestion');
  });
});

describe('header appearance tokens in the AI contract', () => {
  it('keeps the top level header down to colour, weight and size step', () => {
    const headerSchema = CARD_STYLE_AI_SCHEMA.properties.header;

    expect(Object.keys(headerSchema.properties)).toEqual([
      'backgroundColor',
      'titleColorHex',
      'fontWeight',
      'titleSizeToken',
    ]);
  });

  it('keeps conditional rule headers on the narrower legacy shape', () => {
    const conditionalHeaderSchema =
      CARD_STYLE_AI_SCHEMA.properties.conditionalStyles.items.properties.header;

    expect(Object.keys(conditionalHeaderSchema.properties)).toEqual([
      'backgroundColor',
      'titleColorHex',
      'fontWeight',
    ]);
  });

  it('normalizes the new header appearance tokens and drops unknown ones', () => {
    const intent = normalizeOpenAiCardIntent({ header: { titleSizeToken: 'xl' } }, '');

    expect(intent.header).toEqual({ titleSizeToken: 'xl' });

    expect(
      normalizeOpenAiCardIntent({ header: { titleSizeToken: 'huge' } }, '').header,
    ).toBeNull();
  });

  it('drops the retired header knobs and the title line count off an AI payload', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        layout: { titleClamp: 1 },
        header: {
          letterSpacing: '0.02em',
          borderColor: '#94a3b8',
          borderStrengthToken: 'strong',
          borderSide: 'all',
          padding: 'relaxed',
          textAlign: 'center',
        },
      },
      '',
    );

    expect(intent.header).toBeNull();
    expect(intent.layout).toBeNull();
  });
});

describe('field defaults and info labels in the AI contract', () => {
  it('opens the whole-card field defaults to the AI', () => {
    expect(Object.keys(CARD_STYLE_AI_SCHEMA.properties.field.properties)).toEqual(
      expect.arrayContaining([
        'defaultColorRole',
        'defaultFontWeight',
        'defaultFontSize',
      ]),
    );
  });

  it('opens the info label tokens to the AI', () => {
    expect(Object.keys(CARD_STYLE_AI_SCHEMA.properties.info.properties)).toEqual(
      expect.arrayContaining([
        'labelColorRole',
        'labelFontSizeToken',
        'labelFontWeight',
      ]),
    );
  });

  it('normalizes the new field defaults', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        field: {
          defaultColorRole: 'ink',
          defaultFontWeight: 600,
          defaultFontSize: 'lg',
        },
      },
      '',
    );

    expect(intent.field).toEqual({
      defaultColorRole: 'ink',
      defaultFontWeight: 600,
      defaultFontSize: 'lg',
    });
  });

  it('normalizes the new info label tokens', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        info: {
          labelColorRole: 'blue',
          labelFontSizeToken: 'sm',
          labelFontWeight: 700,
        },
      },
      '',
    );

    expect(intent.info).toEqual({
      labelColorRole: 'blue',
      labelFontSizeToken: 'sm',
      labelFontWeight: 700,
    });
  });
});
