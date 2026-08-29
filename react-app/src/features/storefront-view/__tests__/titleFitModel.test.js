import { describe, expect, it } from 'vitest';

import { MIN_TITLE_SCALE, resolveTitleScale } from '../model/card-grid-section/titleFitModel';

describe('resolveTitleScale', () => {
  it('leaves the title alone when it already fits', () => {
    expect(resolveTitleScale({ contentWidth: 120, availableWidth: 200 })).toBe(1);
  });

  it('leaves the title alone when it fits exactly', () => {
    expect(resolveTitleScale({ contentWidth: 200, availableWidth: 200 })).toBe(1);
  });

  it('shrinks by the overflow ratio so one pass lands close', () => {
    // 250 넓이의 글자를 200 안에 넣으려면 0.8 배
    expect(resolveTitleScale({ contentWidth: 250, availableWidth: 200 })).toBeCloseTo(0.8);
  });

  it('stops at the floor instead of shrinking into unreadable text', () => {
    expect(resolveTitleScale({ contentWidth: 2000, availableWidth: 200 })).toBe(MIN_TITLE_SCALE);
  });

  it('honours a caller-supplied floor', () => {
    expect(
      resolveTitleScale({ contentWidth: 2000, availableWidth: 200, minScale: 0.5 }),
    ).toBe(0.5);
  });

  it('does not scale when a measurement is missing or zero', () => {
    expect(resolveTitleScale({ contentWidth: 0, availableWidth: 200 })).toBe(1);
    expect(resolveTitleScale({ contentWidth: 250, availableWidth: 0 })).toBe(1);
    expect(resolveTitleScale({})).toBe(1);
    expect(resolveTitleScale({ contentWidth: NaN, availableWidth: 200 })).toBe(1);
  });
});
