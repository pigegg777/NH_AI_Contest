import { describe, expect, it } from 'vitest';

import { groupAvailableFields, isMandatoryField } from '../model/data-selection/dataSelectionFieldGroupModel';

const AVAILABLE_FIELDS = [
  { key: 'product_name', label: '상품명', exampleValue: 'Alpha', isSelectable: true },
  { key: 'spec', label: '규격', exampleValue: '20kg', isSelectable: true },
  { key: 'tax_price', label: '과세가격', exampleValue: 1000, isSelectable: true },
  { key: 'zero_tax_price', label: '영세가격', exampleValue: 900, isSelectable: true },
  { key: 'large_category', label: '대분류', exampleValue: 'Fertilizer', isSelectable: true },
  { key: 'medium_category', label: '중분류', exampleValue: 'Premium', isSelectable: true },
  { key: 'nutrient', label: '주요 성분', exampleValue: '18-18-18', isSelectable: true },
  { key: 'nutirent', label: '성분', exampleValue: 'N-P-K', isSelectable: true },
];

describe('groupAvailableFields', () => {
  it('splits fields into description, price, and category groups', () => {
    const groups = groupAvailableFields(AVAILABLE_FIELDS);

    expect(groups.price.map((f) => f.key)).toEqual(['tax_price', 'zero_tax_price']);
    expect(groups.category.map((f) => f.key)).toEqual(['large_category', 'medium_category']);
    expect(groups.description.map((f) => f.key)).toEqual(['product_name', 'spec', 'nutrient']);
  });

  it('consolidates nutrient and nutirent into a single "important ingredient" row when both exist', () => {
    const groups = groupAvailableFields(AVAILABLE_FIELDS);
    const consolidated = groups.description.find((f) => f.key === 'nutrient');

    expect(consolidated.label).toBe('중요 성분');
    expect(consolidated.aliasKeys).toEqual(['nutrient', 'nutirent']);
  });

  it('does not consolidate when only one nutrient-like field is available', () => {
    const onlyNutrient = AVAILABLE_FIELDS.filter((f) => f.key !== 'nutirent');
    const groups = groupAvailableFields(onlyNutrient);
    const field = groups.description.find((f) => f.key === 'nutrient');

    expect(field.aliasKeys).toBeUndefined();
    expect(field.label).toBe('주요 성분');
  });

  it('returns empty group arrays for an empty input', () => {
    expect(groupAvailableFields([])).toEqual({ description: [], price: [], category: [] });
  });
});

describe('isMandatoryField', () => {
  it('flags only product_name as mandatory', () => {
    expect(isMandatoryField('product_name')).toBe(true);
    expect(isMandatoryField('spec')).toBe(false);
  });
});
