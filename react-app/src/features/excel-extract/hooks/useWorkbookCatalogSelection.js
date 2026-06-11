import { useEffect, useRef, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { validateCustomCategoryName } from '../model/catalog/officeProductDataCatalogModel';
import { resolveTableNameModeFromCategoryName } from '../model/save/workbookSaveModel';

export function useWorkbookCatalogSelection({ officeProductCatalogItems }) {
  const [tableNameMode, setTableNameMode] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [pendingCustomCategories, setPendingCustomCategories] = useState([]);
  const [selectedCustomCategoryName, setSelectedCustomCategoryName] = useState('');
  const customTableNameInputRef = useRef(null);

  const isShowingExistingCustomCategory =
    tableNameMode === 'custom' && selectedCustomCategoryName !== '';
  const showsCustomTableNameInput = tableNameMode === 'custom' && !isShowingExistingCustomCategory;
  const effectiveCustomTableName = isShowingExistingCustomCategory
    ? selectedCustomCategoryName
    : customTableName;

  useEffect(() => {
    if (!showsCustomTableNameInput) {
      return;
    }

    customTableNameInputRef.current?.focus();
  }, [showsCustomTableNameInput]);

  const trimmedCustomTableName = toTrimmedString(customTableName);
  const existingCategoryNames = [
    ...officeProductCatalogItems.map((item) => item.categoryName),
    ...pendingCustomCategories,
  ];
  const tableNameValidationError =
    showsCustomTableNameInput && trimmedCustomTableName.length > 0
      ? validateCustomCategoryName(trimmedCustomTableName, existingCategoryNames)
      : null;
  const canCreateTable =
    showsCustomTableNameInput && trimmedCustomTableName.length > 0 && !tableNameValidationError;

  function handleCustomTableNameChange(event) {
    setCustomTableName(event.target.value);
  }

  function handleCreateCustomTable() {
    if (!canCreateTable) {
      return;
    }

    setPendingCustomCategories((previous) => [...previous, trimmedCustomTableName]);
    setSelectedCustomCategoryName(trimmedCustomTableName);
    setCustomTableName('');
  }

  function isCardSelected(card) {
    if (card.variant === 'add') {
      return tableNameMode === 'custom' && !isShowingExistingCustomCategory;
    }

    if (card.variant === 'default') {
      return resolveTableNameModeFromCategoryName(card.categoryName) === tableNameMode;
    }

    return isShowingExistingCustomCategory && selectedCustomCategoryName === card.categoryName;
  }

  function handleCatalogSelect(card) {
    if (card.variant === 'add') {
      setTableNameMode('custom');
      setSelectedCustomCategoryName('');
      return;
    }

    const mode = resolveTableNameModeFromCategoryName(card.categoryName);

    if (mode) {
      setTableNameMode(mode);
      setSelectedCustomCategoryName('');
      return;
    }

    setTableNameMode('custom');
    setSelectedCustomCategoryName(card.categoryName);
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
