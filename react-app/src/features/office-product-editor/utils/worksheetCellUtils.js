export function getCell(row, index) {
  if (index == null || index < 0) {
    return null;
  }

  return row[index] ?? null;
}

export function normalizeHeaderCell(value) {
  if (value == null) {
    return '';
  }

  return String(value).replace(/\r?\n/g, '').replace(/\s+/g, '').trim();
}

export function normalizeWorksheetNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = String(value).replace(/,/g, '').trim();
  if (text === '') {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}
