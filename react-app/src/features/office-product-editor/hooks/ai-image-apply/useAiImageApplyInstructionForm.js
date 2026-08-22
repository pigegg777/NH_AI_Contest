import { useState } from 'react';

export function useAiImageApplyInstructionForm({
  handleSelectFile,
  handleGenerateImage,
  isGenerating,
  handleApplyRequest,
  isApplying,
}) {
  const [generatePromptDraft, setGeneratePromptDraft] = useState('');
  const [instructionDraft, setInstructionDraft] = useState('');

  function handleFileInputChange(event) {
    const file = event.target.files?.[0] ?? null;
    handleSelectFile(file);
    event.target.value = '';
  }

  function handleGenerateSubmit() {
    const prompt = generatePromptDraft.trim();

    if (prompt === '' || isGenerating) {
      return;
    }

    handleGenerateImage(prompt);
  }

  function handleApplySubmit() {
    const instruction = instructionDraft.trim();

    if (instruction === '' || isApplying) {
      return;
    }

    handleApplyRequest(instruction);
  }

  return {
    generatePromptDraft,
    setGeneratePromptDraft,
    instructionDraft,
    setInstructionDraft,
    handleFileInputChange,
    handleGenerateSubmit,
    handleApplySubmit,
  };
}
