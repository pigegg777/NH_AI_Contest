export function toTrimmedString(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

export function toNullableTrimmedString(value) {
  const text = toTrimmedString(value);
  return text === '' ? null : text;
}

export function toLowerTrimmedString(value) {
  return toTrimmedString(value).toLowerCase();
}

export function hasTrimmedText(value) {
  return toTrimmedString(value) !== '';
}
