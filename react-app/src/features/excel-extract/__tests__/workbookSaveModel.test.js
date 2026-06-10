import { describe, expect, it } from 'vitest';

import {
  canSaveWorkbookData,
  resolveSaveCategoryName,
  shouldUseStaticDataMerge,
} from '../model/save/workbookSaveModel';

describe('workbookSaveModel', () => {
  describe('resolveSaveCategoryName', () => {
    it('returns the preset category label for default category modes', () => {
      expect(resolveSaveCategoryName('fertilizer', '')).toBe('비료');
      expect(resolveSaveCategoryName('pesticide', '')).toBe('농약');
    });

    it('returns the trimmed custom category name for custom mode', () => {
      expect(resolveSaveCategoryName('custom', '  자재  ')).toBe('자재');
    });
  });

  describe('shouldUseStaticDataMerge', () => {
    it('enables static data merge for fertilizer and pesticide presets only', () => {
      expect(shouldUseStaticDataMerge('fertilizer')).toBe(true);
      expect(shouldUseStaticDataMerge('pesticide')).toBe(true);
      expect(shouldUseStaticDataMerge('custom')).toBe(false);
      expect(shouldUseStaticDataMerge('')).toBe(false);
    });
  });

  describe('canSaveWorkbookData', () => {
    it('returns true only when user, extracted result, rows, and category are all present', () => {
      expect(
        canSaveWorkbookData({
          user: { id: 7, office_code: 'OFF-1', office_name: '본점' },
          result: { warnings: [], rows: [{ row_id: 'A100__01' }] },
          rows: [{ row_id: 'A100__01' }],
          categoryName: '비료',
        }),
      ).toBe(true);

      expect(
        canSaveWorkbookData({
          user: { id: 7, office_code: 'OFF-1', office_name: '본점' },
          result: null,
          rows: [{ row_id: 'A100__01' }],
          categoryName: '비료',
        }),
      ).toBe(false);

      expect(
        canSaveWorkbookData({
          user: { id: 7, office_code: 'OFF-1', office_name: '본점' },
          result: { warnings: [], rows: [{ row_id: 'A100__01' }] },
          rows: [],
          categoryName: '비료',
        }),
      ).toBe(false);
    });
  });
});
