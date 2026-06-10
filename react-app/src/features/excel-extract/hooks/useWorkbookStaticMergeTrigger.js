import { useEffect, useRef } from 'react';

export function useWorkbookStaticMergeTrigger({
  workbookFingerprint,
  hasResult,
  isStaticMergeEnabled,
  isMerged,
  isMerging,
  handleStaticDataMerge,
}) {
  const attemptedFingerprintRef = useRef(null);

  useEffect(() => {
    if (!isStaticMergeEnabled) {
      attemptedFingerprintRef.current = null;
      return;
    }

    if (!workbookFingerprint || !hasResult || isMerged || isMerging) {
      return;
    }

    if (attemptedFingerprintRef.current === workbookFingerprint) {
      return;
    }

    attemptedFingerprintRef.current = workbookFingerprint;
    void handleStaticDataMerge();
  }, [
    handleStaticDataMerge,
    hasResult,
    isMerged,
    isMerging,
    isStaticMergeEnabled,
    workbookFingerprint,
  ]);
}
