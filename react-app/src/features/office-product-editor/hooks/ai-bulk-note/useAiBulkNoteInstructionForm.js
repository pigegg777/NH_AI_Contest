import { useState } from 'react';

export function useAiBulkNoteInstructionForm({ handlePreview, handleUploadReferenceSheet }) {
  const [instructionDraft, setInstructionDraft] = useState('');

  function handleSubmit() {
    const instruction = instructionDraft.trim();

    if (instruction === '') {
      return;
    }

    handlePreview(instruction);
  }

  function handleReferenceSheetInputChange(event) {
    const file = event.target.files?.[0] ?? null;
    handleUploadReferenceSheet(file);
    event.target.value = '';
  }

  return {
    instructionDraft,
    setInstructionDraft,
    handleSubmit,
    handleReferenceSheetInputChange,
  };
}
