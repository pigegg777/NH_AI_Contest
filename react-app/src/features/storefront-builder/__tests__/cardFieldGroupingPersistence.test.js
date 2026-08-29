import { describe, expect, it } from 'vitest';
import { compileCardStyle } from '../model/card-design/style/cardStyleCompiler';
import { DEFAULT_CARD_STYLE } from '../../storefront-view/model/card-design/style/cardStyleModel';

const visibleFields = ['tax_price', 'zero_tax_price', 'company', 'large_category', 'spec'];
const fieldLabels = {
  tax_price: '과세가격',
  zero_tax_price: '영세가격',
  company: '업체',
  large_category: '대분류',
  spec: '규격',
};

const priceGroup = {
  id: 'price',
  label: '가격',
  display: 'inline-group',
  fields: ['tax_price', 'zero_tax_price'],
};
const metaGroup = {
  id: 'meta',
  label: '업체및분류',
  display: 'inline-group',
  fields: ['company', 'large_category'],
};

function shape(bodySlots) {
  return bodySlots.map((slot) =>
    slot.kind === 'field'
      ? slot.field
      : `[${slot.label}:${slot.items.map((item) => item.field).join('+')}]`,
  );
}

function compile(intent, previousCardStyle, previousBodySlots, overrides = {}) {
  return compileCardStyle({
    intent,
    previousCardStyle,
    previousBodySlots,
    cardsPerRow: 1,
    visibleFields,
    fieldLabels,
    ...overrides,
  });
}

describe('card field grouping persistence', () => {
  it('keeps a group through a later unrelated request', () => {
    const grouped = compile({ info: { requestedGroups: [priceGroup] } }, DEFAULT_CARD_STYLE, []);

    expect(shape(grouped.bodySlots)).toEqual([
      '[가격:tax_price+zero_tax_price]',
      'company',
      'large_category',
      'spec',
    ]);

    const afterUnrelated = compile(
      { shell: { backgroundColor: '#f5f5f5' } },
      grouped.cardStyle,
      grouped.bodySlots,
    );

    expect(shape(afterUnrelated.bodySlots)).toEqual(shape(grouped.bodySlots));
    expect(afterUnrelated.cardStyle.info.requestedGroups).toEqual([priceGroup]);
  });

  it('accumulates a second group instead of replacing the first', () => {
    const first = compile({ info: { requestedGroups: [priceGroup] } }, DEFAULT_CARD_STYLE, []);
    const second = compile(
      { info: { requestedGroups: [metaGroup] } },
      first.cardStyle,
      first.bodySlots,
    );

    expect(shape(second.bodySlots)).toEqual([
      '[가격:tax_price+zero_tax_price]',
      '[업체및분류:company+large_category]',
      'spec',
    ]);
    expect(second.cardStyle.info.requestedGroups.map((group) => group.id)).toEqual([
      'price',
      'meta',
    ]);
  });

  it('supports two groups requested in a single turn', () => {
    const both = compile(
      { info: { requestedGroups: [priceGroup, metaGroup] } },
      DEFAULT_CARD_STYLE,
      [],
    );

    expect(shape(both.bodySlots)).toEqual([
      '[가격:tax_price+zero_tax_price]',
      '[업체및분류:company+large_category]',
      'spec',
    ]);
  });

  it('keeps field order through a later unrelated request', () => {
    const ordered = compile(
      { info: { requestedFieldOrder: ['spec', 'tax_price'] } },
      DEFAULT_CARD_STYLE,
      [],
    );

    expect(shape(ordered.bodySlots)).toEqual([
      'spec',
      'tax_price',
      'zero_tax_price',
      'company',
      'large_category',
    ]);

    const afterUnrelated = compile(
      { shell: { backgroundColor: '#f5f5f5' } },
      ordered.cardStyle,
      ordered.bodySlots,
    );

    expect(shape(afterUnrelated.bodySlots)).toEqual(shape(ordered.bodySlots));
  });

  it('drops one group by id and leaves the rest', () => {
    const both = compile(
      { info: { requestedGroups: [priceGroup, metaGroup] } },
      DEFAULT_CARD_STYLE,
      [],
    );
    const removed = compile(
      { info: { removeGroupIds: ['price'] } },
      both.cardStyle,
      both.bodySlots,
    );

    expect(shape(removed.bodySlots)).toEqual([
      'tax_price',
      'zero_tax_price',
      '[업체및분류:company+large_category]',
      'spec',
    ]);
  });

  it('clears every group on an explicit empty requestedGroups', () => {
    const both = compile(
      { info: { requestedGroups: [priceGroup, metaGroup] } },
      DEFAULT_CARD_STYLE,
      [],
    );
    const cleared = compile({ info: { requestedGroups: [] } }, both.cardStyle, both.bodySlots);

    expect(shape(cleared.bodySlots)).toEqual(visibleFields);
    expect(cleared.cardStyle.info.requestedGroups).toEqual([]);
  });

  it('moves a field to the newer group that claims it', () => {
    const first = compile({ info: { requestedGroups: [priceGroup] } }, DEFAULT_CARD_STYLE, []);
    const stolen = compile(
      {
        info: {
          requestedGroups: [
            { id: 'mixed', label: '혼합', display: 'inline-group', fields: ['zero_tax_price', 'spec'] },
          ],
        },
      },
      first.cardStyle,
      first.bodySlots,
    );

    expect(stolen.cardStyle.info.requestedGroups).toEqual([
      { id: 'price', label: '가격', display: 'inline-group', fields: ['tax_price'] },
      { id: 'mixed', label: '혼합', display: 'inline-group', fields: ['zero_tax_price', 'spec'] },
    ]);
  });

  it('seeds groups from previously rendered slots when the saved style has none', () => {
    // A design saved before grouping became persistent: slots carry the group,
    // cardStyle.info does not.
    const legacyBodySlots = [
      {
        id: 'group-price',
        kind: 'inline-group',
        label: '가격',
        items: [
          { id: 'group-price-item-0', field: 'tax_price', label: '과세가격' },
          { id: 'group-price-item-1', field: 'zero_tax_price', label: '영세가격' },
        ],
      },
      { id: 'field-2-company', kind: 'field', field: 'company', label: '업체' },
      { id: 'field-3-large_category', kind: 'field', field: 'large_category', label: '대분류' },
      { id: 'field-4-spec', kind: 'field', field: 'spec', label: '규격' },
    ];

    const next = compile(
      { shell: { backgroundColor: '#f5f5f5' } },
      DEFAULT_CARD_STYLE,
      legacyBodySlots,
    );

    expect(shape(next.bodySlots)).toEqual([
      '[가격:tax_price+zero_tax_price]',
      'company',
      'large_category',
      'spec',
    ]);
  });

  it('drops a hidden field out of a persisted group', () => {
    const grouped = compile({ info: { requestedGroups: [priceGroup] } }, DEFAULT_CARD_STYLE, []);
    const narrowed = compile(
      { shell: { backgroundColor: '#f5f5f5' } },
      grouped.cardStyle,
      grouped.bodySlots,
      { visibleFields: ['tax_price', 'company', 'spec'] },
    );

    expect(shape(narrowed.bodySlots)).toEqual(['[가격:tax_price]', 'company', 'spec']);
  });
});
