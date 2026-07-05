import { useState } from 'react';

import { toTrimmedString } from '../../../../common/utils/text';
import {
  resolveTableNameModeFromCategoryName,
  validateCustomCategoryCreation,
} from '../../model/sidebar-catalog/sidebarCatalogCreateModel';

function createInitialSelectionState(initialSelectionState) {
  return {
    tableNameMode:
      typeof initialSelectionState?.tableNameMode === 'string'
        ? initialSelectionState.tableNameMode
        : '',
    customTableName:
      typeof initialSelectionState?.customTableName === 'string'
        ? initialSelectionState.customTableName
        : '',
    pendingCustomCategories: Array.isArray(initialSelectionState?.pendingCustomCategories)
      ? initialSelectionState.pendingCustomCategories
      : [],
    activeCustomCategoryName:
      typeof initialSelectionState?.activeCustomCategoryName === 'string'
        ? initialSelectionState.activeCustomCategoryName
        : '',
  };
}

export function useWorkbookCatalogSelection({
  officeProductCatalogItems,
  initialSelectionState = null,
}) {
  const initialState = createInitialSelectionState(initialSelectionState);
  const [tableNameMode, setTableNameMode] = useState(initialState.tableNameMode);
  const [customTableName, setCustomTableName] = useState(initialState.customTableName);
  const [pendingCustomCategories, setPendingCustomCategories] = useState(
    initialState.pendingCustomCategories,
  );
  const [activeCustomCategoryName, setActiveCustomCategoryName] = useState(
    initialState.activeCustomCategoryName,
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isShowingExistingCustomCategory =
    tableNameMode === 'custom' && activeCustomCategoryName !== '';
  const showsCustomTableNameInput =
    tableNameMode === 'custom' && !isShowingExistingCustomCategory;
  const effectiveCustomTableName = isShowingExistingCustomCategory
    ? activeCustomCategoryName
    : '';

  const existingCategoryNames = [
    ...officeProductCatalogItems.map((item) => item.categoryName),
    ...pendingCustomCategories,
  ];

  const tableNameValidationError =
    showsCustomTableNameInput && submitAttempted
      ? validateCustomCategoryCreation(customTableName, existingCategoryNames)
          .message ||
        (toTrimmedString(customTableName).length === 0
          ? '테이블 이름을 입력하세요'
          : '')
      : '';

  function handleCustomTableNameChange(event) {
    setCustomTableName(event.target.value);
    setSubmitAttempted(false);
  }

  function handleCreateCustomTable() {
    if (!showsCustomTableNameInput) {
      return;
    }

    const validation = validateCustomCategoryCreation(
      customTableName,
      existingCategoryNames,
    );

    if (!validation.isValid) {
      setSubmitAttempted(true);
      return;
    }

    setSubmitAttempted(false);
    setPendingCustomCategories((previous) =>
      previous.includes(validation.normalizedCategoryName)
        ? previous
        : [...previous, validation.normalizedCategoryName],
    );
    setCustomTableName('');
  }

  function handlePendingCustomCategoryDelete(categoryName) {
    const normalizedCategoryName = toTrimmedString(categoryName);

    if (normalizedCategoryName.length === 0) {
      return;
    }

    setPendingCustomCategories((previous) =>
      previous.filter((name) => name !== normalizedCategoryName),
    );
    setSubmitAttempted(false);

    if (activeCustomCategoryName === normalizedCategoryName) {
      setTableNameMode('custom');
      setActiveCustomCategoryName('');
    }
  }

  function isCardSelected(card) {
    if (card.isAdd) {
      return tableNameMode === 'custom' && !isShowingExistingCustomCategory;
    }

    if (card.selectionMode) {
      return card.selectionMode === tableNameMode;
    }

    return (
      isShowingExistingCustomCategory &&
      activeCustomCategoryName === card.categoryName
    );
  }

  function handleCatalogSelect(card) {
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
    activeCustomCategoryName,
    effectiveCustomTableName,
    showsCustomTableNameInput,
    handleCustomTableNameChange,
    handleCreateCustomTable,
    handlePendingCustomCategoryDelete,
    tableNameValidationError,
    isCardSelected,
    handleCatalogSelect,
  };
}
