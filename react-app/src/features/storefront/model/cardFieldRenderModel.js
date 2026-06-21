import { PRICE_FIELD_KEYS } from './storefrontUiModel';

export function hasRenderableValue(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function formatFieldDisplayValue(field, value) {
  if (!hasRenderableValue(value)) {
    return '';
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map((item) => (item !== null && typeof item === 'object' ? '{...}' : String(item)))
      .join(', ');

    return `[${preview}${value.length > 3 ? ', ...' : ''}]`;
  }

  if (typeof value === 'object') {
    return '상세 정보 보기';
  }

  if (PRICE_FIELD_KEYS.includes(field)) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? `${numericValue.toLocaleString()}원` : String(value);
  }

  return String(value);
}
