import { NUTRIENT_FIELD_KEYS } from '../storefront-config/storefrontUiModel';

export const PRICE_GROUP_FIELD_KEYS = ['zero_tax_price', 'tax_price', 'exempt_tax_price', 'price_subsidy'];
export const CATEGORY_GROUP_FIELD_KEYS = ['large_category', 'medium_category', 'small_category', 'detail_category'];

export function isMandatoryField(key) {
  return key === 'product_name';
}

export function groupAvailableFields(availableFields) {
  const fields = Array.isArray(availableFields) ? availableFields : [];
  const nutrientFieldsPresent = fields.filter((field) => NUTRIENT_FIELD_KEYS.includes(field.key));
  const shouldConsolidateNutrient = nutrientFieldsPresent.length > 1;
  let nutrientConsolidatedOnce = false;

  const description = [];
  const price = [];
  const category = [];

  fields.forEach((field) => {
    if (shouldConsolidateNutrient && NUTRIENT_FIELD_KEYS.includes(field.key)) {
      if (nutrientConsolidatedOnce) {
        return;
      }

      nutrientConsolidatedOnce = true;
      description.push({
        key: field.key,
        label: '중요 성분',
        exampleValue: field.exampleValue,
        isSelectable: nutrientFieldsPresent.every((nutrientField) => nutrientField.isSelectable),
        aliasKeys: nutrientFieldsPresent.map((nutrientField) => nutrientField.key),
      });
      return;
    }

    if (PRICE_GROUP_FIELD_KEYS.includes(field.key)) {
      price.push(field);
    } else if (CATEGORY_GROUP_FIELD_KEYS.includes(field.key)) {
      category.push(field);
    } else {
      description.push(field);
    }
  });

  return { description, price, category };
}
