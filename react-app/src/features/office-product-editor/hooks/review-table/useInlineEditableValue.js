import { useEffect, useState } from 'react';

export function useInlineEditableValue(value, { onCommit, parseDraft = (draft) => draft }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? '');

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value ?? '');
    }
  }, [isEditing, value]);

  function open() {
    setIsEditing(true);
  }

  function cancel() {
    setDraftValue(value ?? '');
    setIsEditing(false);
  }

  function commit() {
    const parsed = parseDraft(draftValue);

    if (parsed === undefined) {
      return;
    }

    onCommit(parsed);
    setIsEditing(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') {
      commit();
    }

    if (event.key === 'Escape') {
      cancel();
    }
  }

  return { isEditing, draftValue, setDraftValue, open, commit, handleKeyDown };
}
