import { useState } from 'react';

import { normalizeCardFields } from '../model/storefrontBuilderModel';

export function useDataSelectionDraft({ allowedScalarKeys, initialFields } = {}) {
  const [draft, setDraft] = useState(() => normalizeCardFields(initialFields, allowedScalarKeys));
  const [committed, setCommitted] = useState(() => normalizeCardFields(initialFields, allowedScalarKeys));

  const isConfirmed = draft.length === committed.length && draft.every((field, index) => field === committed[index]);

  function toggleField(field) {
    if (field === 'product_name') {
      return;
    }

    setDraft((current) => {
      const nextRaw = current.includes(field) ? current.filter((value) => value !== field) : [...current, field];
      return normalizeCardFields(nextRaw, allowedScalarKeys);
    });
  }

  function confirm() {
    setCommitted(draft);
  }

  function reset(nextFields) {
    const normalized = normalizeCardFields(nextFields, allowedScalarKeys);
    setDraft(normalized);
    setCommitted(normalized);
  }

  return { draft, committed, isConfirmed, toggleField, confirm, reset };
}
