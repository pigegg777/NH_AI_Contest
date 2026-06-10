import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useWorkbookStaticMergeTrigger } from '../hooks/useWorkbookStaticMergeTrigger';

describe('useWorkbookStaticMergeTrigger', () => {
  it('requests a merge once when a default category is active and a workbook result exists', () => {
    const handleStaticDataMerge = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useWorkbookStaticMergeTrigger({
        workbookFingerprint: 'workbook-a',
        hasResult: true,
        isStaticMergeEnabled: true,
        isMerged: false,
        isMerging: false,
        handleStaticDataMerge,
      }),
    );

    expect(handleStaticDataMerge).toHaveBeenCalledTimes(1);
  });

  it('does not request a merge for custom categories', () => {
    const handleStaticDataMerge = vi.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useWorkbookStaticMergeTrigger({
        workbookFingerprint: 'workbook-a',
        hasResult: true,
        isStaticMergeEnabled: false,
        isMerged: false,
        isMerging: false,
        handleStaticDataMerge,
      }),
    );

    expect(handleStaticDataMerge).not.toHaveBeenCalled();
  });
});
