import { useState } from 'react';

import { toTrimmedString } from '../../../../common/utils/text';
import {
  resolveTableNameModeFromCategoryName,
  validateCustomCategoryCreation,
} from '../../model/sidebar-catalog/sidebarCatalogCreateModel';

export function useWorkbookCatalogSelection({ officeProductCatalogItems }) {
  const [tableNameMode, setTableNameMode] = useState('');
  const [customTableName, setCustomTableName] = useState('');
  const [pendingCustomCategories, setPendingCustomCategories] = useState([]);
  const [activeCustomCategoryName, setActiveCustomCategoryName] = useState('');
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
    effectiveCustomTableName,
    showsCustomTableNameInput,
    handleCustomTableNameChange,
    handleCreateCustomTable,
    tableNameValidationError,
    isCardSelected,
    handleCatalogSelect,
  };
}
