import { describe, expect, it } from 'vitest';

import { compileCardStyle } from '../model/card-design/style/cardStyleCompiler';
import { normalizeOpenAiCardIntent } from '../model/card-design/ai-response/cardStyleAiResponseNormalizer';
import { DEFAULT_CARD_STYLE } from '../../storefront-view/model/card-design/style/cardStyleModel';

const FIELD_LABELS = { tax_price: '과세가격', medium_category: '소분류' };

function buildRawOpenAiPayload() {
  return {
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
    explanation: '종자 소분류 카드만 배경을 연두색으로 바꿨어요.',
    suggestion: null,
  };
}

describe('conditionalStyles survives the real server -> client -> compiler round trip', () => {
  it('keeps the rule after being normalized twice (server-side, then client-side) and JSON round-tripped', () => {
    const rawPayload = buildRawOpenAiPayload();

    const serverIntent = normalizeOpenAiCardIntent(rawPayload, '');
    const wireBody = JSON.parse(JSON.stringify({ intent: serverIntent, explanation: rawPayload.explanation, suggestion: rawPayload.suggestion }));

    const clientIntent = normalizeOpenAiCardIntent(wireBody.intent, '');

    expect(clientIntent.conditionalStyles).toEqual([
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

    const result = compileCardStyle({
      intent: clientIntent,
      previousCardStyle: DEFAULT_CARD_STYLE,
      cardsPerRow: 2,
      visibleFields: ['product_name', 'medium_category'],
      fieldLabels: FIELD_LABELS,
    });

    expect(result.cardStyle.conditionalStyles).toEqual(clientIntent.conditionalStyles);
  });

  it('also survives when a target scope is active during both normalize passes', () => {
    const rawPayload = buildRawOpenAiPayload();

    const serverIntent = normalizeOpenAiCardIntent(rawPayload, 'header');
    const wireBody = JSON.parse(JSON.stringify({ intent: serverIntent }));
    const clientIntent = normalizeOpenAiCardIntent(wireBody.intent, 'header');

    expect(clientIntent.conditionalStyles).toHaveLength(1);
    expect(clientIntent.conditionalStyles[0].shell.backgroundColor).toBe('#e6f7d9');
  });
});
