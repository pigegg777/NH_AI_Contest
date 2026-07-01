import { useEffect, useRef, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import {
  resolveTableNameModeFromCategoryName,
  validateCustomCategoryCreation,
} from '../model/sidebar-catalog/sidebarCatalogCreateModel';

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
    if (card.isAdd) {
      return tableNameMode === 'custom' && !isShowingExistingCustomCategory;
    }

    if (card.selectionMode) {
      return card.selectionMode === tableNameMode;
    }

    return isShowingExistingCustomCategory && activeCustomCategoryName === card.categoryName;
  }

  function handleCatalogSelect(card) {
    clearCreateError();

    if (card.isAdd) {
      setTableNameMode('custom');
      setActiveCustomCategoryName('');
      return;
    }

    const mode = card.selectionMode;

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
