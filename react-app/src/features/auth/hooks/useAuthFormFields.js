import { useState } from 'react';

export function useAuthFormFields(initialForm, onFieldChange) {
  const [form, setForm] = useState(initialForm);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    onFieldChange?.();
  }

  return {
    form,
    handleChange,
  };
}
