import { describe, expect, it } from 'vitest';

import { shouldUseStaticDataMerge } from '../model/static-data-merge/staticDataMergeModel';

describe('staticDataMergeModel', () => {
  describe('shouldUseStaticDataMerge', () => {
    it('enables static data merge for fertilizer and pesticide presets only', () => {
      expect(shouldUseStaticDataMerge('fertilizer')).toBe(true);
      expect(shouldUseStaticDataMerge('pesticide')).toBe(true);
      expect(shouldUseStaticDataMerge('custom')).toBe(false);
      expect(shouldUseStaticDataMerge('')).toBe(false);
    });
  });
});
