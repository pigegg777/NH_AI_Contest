import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  ensureReadableTextColor,
  isHexColor,
  mixHexColors,
  normalizeHexColor,
  pickReadableTextColor,
} from '../model/page-design/pageStyleColor';

describe('isHexColor', () => {
  it('accepts 3- and 6-digit hex, rejects everything else', () => {
    expect(isHexColor('#1d4a2e')).toBe(true);
    expect(isHexColor('#fff')).toBe(true);
    expect(isHexColor('1d4a2e')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});

describe('normalizeHexColor', () => {
  it('lowercases and expands 3-digit hex, falls back on invalid input', () => {
    expect(normalizeHexColor('#FFF', '#000000')).toBe('#ffffff');
    expect(normalizeHexColor('#1D4A2E', '#000000')).toBe('#1d4a2e');
    expect(normalizeHexColor('not-a-color', '#000000')).toBe('#000000');
    expect(normalizeHexColor(undefined, '#000000')).toBe('#000000');
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black-on-white and 1 for identical colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#1d4a2e', '#1d4a2e')).toBeCloseTo(1, 5);
  });
});

describe('pickReadableTextColor', () => {
  it('picks dark text on light backgrounds and light text on dark backgrounds', () => {
    expect(pickReadableTextColor('#ffffff')).toBe('#111827');
    expect(pickReadableTextColor('#0f172a')).toBe('#ffffff');
  });
});

describe('ensureReadableTextColor', () => {
  it('keeps a candidate color that already passes AA contrast', () => {
    expect(ensureReadableTextColor('#111827', '#ffffff')).toBe('#111827');
  });

  it('replaces a candidate that fails AA contrast with a readable alternative', () => {
    expect(ensureReadableTextColor('#f5f5f5', '#ffffff')).toBe('#111827');
    expect(contrastRatio(ensureReadableTextColor('#fefefe', '#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('mixHexColors', () => {
  it('returns hexA at weight 0 and hexB at weight 1', () => {
    expect(mixHexColors('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHexColors('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('blends proportionally at weight 0.5', () => {
    expect(mixHexColors('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});
