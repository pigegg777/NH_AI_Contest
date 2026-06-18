import { useEffect, useRef, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { validateCustomCategoryCreation } from '../model/officeProductDataCatalogModel';
import { resolveTableNameModeFromCategoryName } from '../model/workbookSaveModel';

export function useWorkbookCatalogSelection({ officeProductCatalogItems }) {
  const [tableNameMode, setTableNameMode] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [pendingCustomCategories, setPendingCustomCategories] = useState([]);
  const [activeCustomCategoryName, setActiveCustomCategoryName] = useState('');
  const [tableNameValidationError, setTableNameValidationError] = useState('');
  const customTableNameInputRef = useRef(null);

  const isShowingExistingCustomCategory =
    tableNameMode === 'custom' && activeCustomCategoryName !== '';
  const showsCustomTableNameInput = tableNameMode === 'custom' && !isShowingExistingCustomCategory;
  const effectiveCustomTableName = isShowingExistingCustomCategory ? activeCustomCategoryName : '';
  const trimmedCustomTableName = toTrimmedString(customTableName);
  const existingCategoryNames = [
    ...officeProductCatalogItems.map((item) => item.categoryName),
    ...pendingCustomCategories,
  ];
  const canCreateTable = showsCustomTableNameInput && trimmedCustomTableName.length > 0;

  useEffect(() => {
    if (!showsCustomTableNameInput) {
      return;
    }

    customTableNameInputRef.current?.focus();
  }, [showsCustomTableNameInput]);

  function clearCreateError() {
    setTableNameValidationError('');
  }

  function handleCustomTableNameChange(event) {
    setCustomTableName(event.target.value);
    clearCreateError();
  }

  function handleCreateCustomTable() {
    if (!showsCustomTableNameInput) {
      return;
    }

    const validation = validateCustomCategoryCreation(customTableName, existingCategoryNames);

    if (!validation.isValid) {
      setTableNameValidationError(validation.message);
      return;
    }

    setPendingCustomCategories((previous) =>
      previous.includes(validation.normalizedCategoryName)
        ? previous
        : [...previous, validation.normalizedCategoryName],
    );
    setCustomTableName('');
    clearCreateError();
  }

  function isCardSelected(card) {
    if (card.variant === 'add') {
      return tableNameMode === 'custom' && !isShowingExistingCustomCategory;
    }

    if (card.variant === 'default') {
      return resolveTableNameModeFromCategoryName(card.categoryName) === tableNameMode;
    }

    return isShowingExistingCustomCategory && activeCustomCategoryName === card.categoryName;
  }

  function handleCatalogSelect(card) {
    clearCreateError();

    if (card.variant === 'add') {
      setTableNameMode('custom');
      setActiveCustomCategoryName('');
      return;
    }

    const mode = resolveTableNameModeFromCategoryName(card.categoryName);

    if (mode) {
      setTableNameMode(mode);
      setActiveCustomCategoryName('');
      return;
    }

    setTableNameMode('custom');
    setActiveCustomCategoryName(card.categoryName);
  }

  return {
    tableNameMode,
    customTableName,
    pendingCustomCategories,
    effectiveCustomTableName,
    showsCustomTableNameInput,
    customTableNameInputRef,
    handleCustomTableNameChange,
    handleCreateCustomTable,
    tableNameValidationError,
    canCreateTable,
    isCardSelected,
    handleCatalogSelect,
  };
}
