const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * Formats when the price data was last uploaded. Returns an empty string for a
 * missing or unparseable value so the storefront simply renders nothing rather
 * than showing "Invalid Date" to a shopper.
 */
export function formatProductUpdatedAt(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? '' : DATE_TIME_FORMATTER.format(date);
}

/**
 * The most recent upload across an office's categories. Used by the builder
 * preview, which holds the per-category entries the public RPC aggregates.
 */
export function resolveLatestProductUpdatedAt(entries) {
  let latest = '';

  for (const entry of Array.isArray(entries) ? entries : []) {
    const value = entry?.updatedAt;

    if (!value) {
      continue;
    }

    const time = new Date(value).getTime();

    if (Number.isNaN(time)) {
      continue;
    }

    if (!latest || time > new Date(latest).getTime()) {
      latest = value;
    }
  }

  return latest;
}
