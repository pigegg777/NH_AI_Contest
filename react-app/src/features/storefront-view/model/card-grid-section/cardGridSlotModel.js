import { hasRenderableValue } from './cardFieldRenderModel';
import { buildFieldSlots } from '../card-style/cardCompositionModel';
import {
  STOREFRONT_FIELD_LABELS,
  sortFieldKeysByDisplayOrder,
} from '../config-schema/storefrontConfigModel';

function resolveAllowedInfoFields(visibleFields) {
  return sortFieldKeysByDisplayOrder(
    visibleFields.filter(
      (field) => field !== 'img_url' && field !== 'product_name',
    ),
  );
}

export function buildResolvedInfoSlots(visibleFields, bodySlots) {
  const allowedInfoFields = resolveAllowedInfoFields(visibleFields);

  if (!Array.isArray(bodySlots) || bodySlots.length === 0) {
    return buildFieldSlots(allowedInfoFields, STOREFRONT_FIELD_LABELS);
  }

  const allowedFieldSet = new Set(allowedInfoFields);
  const includedFields = new Set();
  const nextSlots = [];

  bodySlots.forEach((slot) => {
    if (slot?.kind === 'field') {
      if (!allowedFieldSet.has(slot.field)) {
        return;
      }

      includedFields.add(slot.field);
      nextSlots.push(slot);
      return;
    }

    if (slot?.kind === 'inline-group' || slot?.kind === 'stack-group') {
      const filteredItems = (Array.isArray(slot.items) ? slot.items : []).filter(
        (item) => allowedFieldSet.has(item?.field),
      );

      if (filteredItems.length === 0) {
        return;
      }

      filteredItems.forEach((item) => {
        includedFields.add(item.field);
      });
      nextSlots.push({ ...slot, items: filteredItems });
    }
  });

  const missingFields = allowedInfoFields.filter(
    (field) => !includedFields.has(field),
  );

  if (missingFields.length === 0) {
    return nextSlots;
  }

  return [
    ...nextSlots,
    ...buildFieldSlots(missingFields, STOREFRONT_FIELD_LABELS),
  ];
}

export function filterVisibleSlotItems(items, product) {
  return (Array.isArray(items) ? items : []).filter(
    (item) => item?.field && hasRenderableValue(product?.[item.field]),
  );
}
