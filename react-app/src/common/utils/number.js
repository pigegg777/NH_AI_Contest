export function toNumberOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
