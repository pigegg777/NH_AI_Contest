import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildCardStyleOpenAiRequestBody,
  buildHeuristicCardAiExplanation,
  buildHeuristicCardAiIntent,
  CARD_STYLE_AI_SCHEMA,
  detectAccentHexFromPrompt,
  detectFieldIntentCandidate,
  detectHeaderIntentCandidate,
  detectImageIntentCandidate,
  detectInfoIntentCandidate,
  detectLayoutIntentCandidate,
  detectShellIntentCandidate,
  normalizeOpenAiCardExplanation,
  normalizeOpenAiCardIntent,
} from '../services/cardStyleAiContract';

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
      CARD_STYLE_AI_SCHEMA.properties.layout.properties.titleClamp.type,
    ).toContain('null');
    expect(
      CARD_STYLE_AI_SCHEMA.properties.info.properties.requestedFieldOrder.type,
    ).toContain('null');
  });
});

describe('detectAccentHexFromPrompt', () => {
  it('maps color words to a resolved accent hex', () => {
    expect(detectAccentHexFromPrompt('make it feel blue and trustworthy')).toBe(
      '#2563eb',
    );
    expect(detectAccentHexFromPrompt('no recognizable color here')).toBe('');
  });
});

describe('detectShellIntentCandidate', () => {
  it('detects radius, shadow, and spacing keywords', () => {
    expect(
      detectShellIntentCandidate('rounded corners, strong shadow, spacious'),
    ).toEqual({
      radius: 'xl',
      shadow: 'strong',
      spacing: 'relaxed',
    });
  });

  it('returns null for unrelated text', () => {
    expect(detectShellIntentCandidate('just vibes')).toBeNull();
  });
});

describe('detectHeaderIntentCandidate', () => {
  it('recognizes title color, letter spacing, and font weight wording', () => {
    expect(detectHeaderIntentCandidate('make the title bolder and darker')).toEqual(
      {
        titleColorHex: '#111827',
        fontWeight: 800,
      },
    );
  });

  it('derives a header background tint from a detected accent color', () => {
    expect(
      detectHeaderIntentCandidate('blue and trustworthy', '#2563eb')
        .backgroundColor,
    ).toBe('#eef3fd');
  });

  it('an explicit dark-header phrase wins over the accent-derived tint', () => {
    expect(
      detectHeaderIntentCandidate('make the header darker', '#2563eb'),
    ).toMatchObject({ backgroundColor: '#1f2937' });
  });
});

describe('detectImageIntentCandidate', () => {
  it('only produces fit and sizeDeltaSteps', () => {
    expect(
      detectImageIntentCandidate('make the image larger and use contain'),
    ).toEqual({
      sizeDeltaSteps: 1,
      fit: 'contain',
    });
  });

  it('returns null when nothing image-related is mentioned', () => {
    expect(detectImageIntentCandidate('leave it alone')).toBeNull();
  });
});

describe('detectInfoIntentCandidate', () => {
  it('detects spacing and price grouping requests scoped to visible fields', () => {
    const candidate = detectInfoIntentCandidate(
      'group the prices inline for comparison',
      ['product_name', 'tax_price', 'zero_tax_price'],
    );

    expect(candidate.requestedGroups).toEqual([
      {
        id: 'price-compare',
        label: '가격',
        display: 'inline-group',
        fields: ['tax_price', 'zero_tax_price'],
      },
    ]);
  });

  it('detects a price-first reorder request', () => {
    const candidate = detectInfoIntentCandidate(
      'show price first',
      ['product_name', 'spec', 'tax_price'],
    );

    expect(candidate.requestedFieldOrder).toEqual(['tax_price']);
  });
});

describe('detectLayoutIntentCandidate', () => {
  it('infers layout choices from ordinary language without a fixed preset command', () => {
    expect(
      detectLayoutIntentCandidate(
        'make the card compact, move the image on the left, and keep the title to one line',
        ['product_name', 'img_url', 'spec'],
      ),
    ).toEqual({
      titleClamp: 1,
      imagePlacement: 'left',
      contentDensity: 'compact',
    });
  });
});

describe('detectFieldIntentCandidate', () => {
  it('only targets fields explicitly named in the prompt', () => {
    const candidate = detectFieldIntentCandidate(
      'make the tax price red and bold',
      ['product_name', 'tax_price', 'spec'],
    );

    expect(candidate.targetedFieldStyles).toEqual([
      {
        field: 'tax_price',
        colorRole: 'red',
        fontWeight: 'bold',
        fontSize: 'medium',
        emphasis: 'strong',
      },
    ]);
  });

  it('defaults the price color role to brand when an accent color is detected', () => {
    expect(
      detectFieldIntentCandidate('blue and trustworthy', ['product_name'], '#2563eb')
        .priceColorRole,
    ).toBe('brand');
  });
});

describe('buildHeuristicCardAiIntent scope gating', () => {
  it('with no scope selected, lets one prompt affect multiple areas at once', () => {
    const intent = buildHeuristicCardAiIntent({
      cardAiDesign: { prompt: 'blue and trustworthy, make the title bolder' },
      visibleFields: ['product_name', 'tax_price'],
    });

    expect(intent.header).toEqual({
      fontWeight: 800,
      backgroundColor: '#eef3fd',
    });
    expect(intent.field).toEqual({
      priceColorRole: 'brand',
      targetedFieldStyles: [],
    });
  });

  it('locking to the header scope nulls out every other area even if the wording would match them', () => {
    const intent = buildHeuristicCardAiIntent({
      cardAiDesign: {
        prompt: 'blue and trustworthy, make the title bolder',
        targetScope: 'header',
      },
      visibleFields: ['product_name', 'tax_price'],
    });

    expect(intent.header).toEqual({
      fontWeight: 800,
      backgroundColor: '#eef3fd',
    });
    expect(intent.field).toBeNull();
  });

  it('shell, structuralPresetRequest, and titleModeRequest are never gated by scope', () => {
    const intent = buildHeuristicCardAiIntent({
      cardAiDesign: {
        prompt: 'image left and rounded corners',
        targetScope: 'field',
      },
    });

    expect(intent.structuralPresetRequest).toBe('image-left');
    expect(intent.shell).toEqual({ radius: 'xl' });
  });

  it('returns null structural and title-mode requests when the prompt does not address them', () => {
    const intent = buildHeuristicCardAiIntent({
      cardAiDesign: { prompt: 'leave the card as it is' },
    });

    expect(intent.structuralPresetRequest).toBeNull();
    expect(intent.titleModeRequest).toBeNull();
  });
});

describe('normalizeOpenAiCardIntent', () => {
  it('normalizes a full OpenAI-shaped payload, trimming id/label/field strings in info groups and orders', () => {
    const intent = normalizeOpenAiCardIntent(
      {
        structuralPresetRequest: 'image-left',
        titleModeRequest: 'inline',
        layout: { cardsPerRow: 2, sectionOrder: ['header', 'image'], imagePlacement: null, titleClamp: null, contentDensity: null, emphasis: null, groupingHint: null },
        shell: { backgroundColor: null, borderColor: null, shadow: 'strong', radius: null, spacing: null },
        header: { backgroundColor: null, titleColorHex: '#111827', letterSpacing: null, fontWeight: null },
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
    expect(intent.layout).toEqual({ cardsPerRow: 2, sectionOrder: ['header', 'image'] });
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
});

describe('CARD_STYLE_AI_SCHEMA explanation/suggestion fields', () => {
  it('requires explanation as a plain string and suggestion as a nullable string', () => {
    expect(CARD_STYLE_AI_SCHEMA.properties.explanation).toEqual({ type: 'string' });
    expect(CARD_STYLE_AI_SCHEMA.properties.suggestion.type).toContain('null');
    expect(CARD_STYLE_AI_SCHEMA.required).toContain('explanation');
    expect(CARD_STYLE_AI_SCHEMA.required).toContain('suggestion');
  });
});

describe('buildHeuristicCardAiExplanation', () => {
  it('lists the Korean labels of every non-null intent section', () => {
    const explanation = buildHeuristicCardAiExplanation({
      header: { fontWeight: 800 },
      field: { priceColorRole: 'brand' },
      image: null,
      info: null,
      shell: null,
      layout: null,
    });

    expect(explanation).toBe('제목 영역, 항목 스타일을 요청하신 대로 변경했습니다.');
  });

  it('returns a fallback sentence when nothing changed', () => {
    expect(
      buildHeuristicCardAiExplanation({
        header: null,
        field: null,
        image: null,
        info: null,
        shell: null,
        layout: null,
      }),
    ).toBe('요청하신 내용에서 적용할 수 있는 변경 사항을 찾지 못했습니다.');
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
