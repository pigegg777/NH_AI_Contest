import { describe, expect, it } from 'vitest';

import {
  formatProductUpdatedAt,
  resolveLatestProductUpdatedAt,
} from '../model/storefront-view/productUpdatedAtModel';

describe('formatProductUpdatedAt', () => {
  it('formats an ISO timestamp as a Korean date and time', () => {
    const label = formatProductUpdatedAt('2026-08-25T06:04:00Z');

    expect(label).toMatch(/2026/);
    expect(label).toMatch(/8/);
    expect(label).toMatch(/25/);
    // Time is part of it, not just the date.
    expect(label).toMatch(/\d{1,2}:\d{2}/);
  });

  it('renders nothing rather than "Invalid Date" for junk', () => {
    expect(formatProductUpdatedAt('not-a-date')).toBe('');
  });

  it('renders nothing when the office has no product data yet', () => {
    expect(formatProductUpdatedAt('')).toBe('');
    expect(formatProductUpdatedAt(null)).toBe('');
    expect(formatProductUpdatedAt(undefined)).toBe('');
  });
});

describe('resolveLatestProductUpdatedAt', () => {
  it('picks the most recent upload across categories', () => {
    expect(
      resolveLatestProductUpdatedAt([
        { categoryName: '비료', updatedAt: '2026-08-20T00:00:00Z' },
        { categoryName: '농약', updatedAt: '2026-08-25T00:00:00Z' },
        { categoryName: '자재', updatedAt: '2026-08-11T00:00:00Z' },
      ]),
    ).toBe('2026-08-25T00:00:00Z');
  });

  it('skips entries with a missing or unparseable timestamp', () => {
    expect(
      resolveLatestProductUpdatedAt([
        { categoryName: '비료', updatedAt: null },
        { categoryName: '농약', updatedAt: 'nonsense' },
        { categoryName: '자재', updatedAt: '2026-08-11T00:00:00Z' },
      ]),
    ).toBe('2026-08-11T00:00:00Z');
  });

  it('returns an empty string when there is nothing to report', () => {
    expect(resolveLatestProductUpdatedAt([])).toBe('');
    expect(resolveLatestProductUpdatedAt(null)).toBe('');
    expect(resolveLatestProductUpdatedAt([{ categoryName: '비료' }])).toBe('');
  });
});
