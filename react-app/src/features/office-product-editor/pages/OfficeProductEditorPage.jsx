import { useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { useActiveCategoryData } from '../hooks/useActiveCategoryData';
import { useOfficeProductDataCatalog } from '../hooks/useOfficeProductDataCatalog';
import { useOfficeProductDataDeletion } from '../hooks/useOfficeProductDataDeletion';
import { useWorkbookAiRecommendations } from '../hooks/useWorkbookAiRecommendations';
import { useWorkbookCatalogSelection } from '../hooks/useWorkbookCatalogSelection';
import { useWorkbookExtraction } from '../hooks/useWorkbookExtraction';
import { useWorkbookReviewTableState } from '../hooks/useWorkbookReviewTableState';
import { useWorkbookSave } from '../hooks/useWorkbookSave';
import { buildOfficeProductDataCatalogModel } from '../model/officeProductDataCatalogModel';
import { shouldUseStaticDataMerge } from '../model/workbookSaveModel';
import { WorkbookReviewBanner } from '../components/workbook-review/WorkbookReviewBanner';
import { WorkbookReviewSidebar } from '../components/workbook-review/WorkbookReviewSidebar';
import { WorkbookReviewWorkspace } from '../components/workbook-review/workspace-ui/WorkbookReviewWorkspace';
import styles from './OfficeProductEditorPage.module.css';

export default function OfficeProductEditorPage({ user }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
    processFile,
    resetWorkbook,
  } = useWorkbookExtraction();

  const {
    items: officeProductCatalogItems,
    isLoading: isOfficeProductCatalogLoading,
    errorMessage: officeProductCatalogErrorMessage,
    removeItem: removeOfficeProductCatalogItem,
    upsertItem: upsertOfficeProductCatalogItem,
  } = useOfficeProductDataCatalog(user);

  const {
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
  } = useWorkbookCatalogSelection({ officeProductCatalogItems });

  const isStaticMergeEnabled = shouldUseStaticDataMerge(tableNameMode);

  const {
    activeCategoryName,
    registeredCatalogItem,
    isViewingRegisteredData,
    isRegisteredProductDataLoading,
    registeredProductDataErrorMessage,
    extractedRows,
    effectiveFingerprint,
    bannerStatusLabel,
    bannerStatusVariant,
  } = useActiveCategoryData({
    user,
    tableNameMode,
    effectiveCustomTableName,
    officeProductCatalogItems,
    result,
    workbookFingerprint,
  });

  const {
    rows,
    warningRows,
    mergedRows,
    searchQuery,
    setSearchQuery,
    filters,
    filterOptions,
    sortState,
    setSortState,
    handleFilterChange,
    resetFilters,
    toggleShadow,
    setShadowForRows,
    updateNote,
    updatePrice,
    isMerging,
    isMerged,
    mergeError,
    mergeStatusMessage,
  } = useWorkbookReviewTableState(extractedRows, effectiveFingerprint, {
    hasResult: Boolean(result),
    isStaticMergeEnabled,
    tableNameMode,
  });

  const {
    recommendations: aiRecommendations,
    analysisMode: aiAnalysisMode,
    isAnalyzing: aiIsAnalyzing,
    errorMessage: aiErrorMessage,
    activeRecommendationId: aiActiveRecommendationId,
    handleAnalyze: handleAiAnalyze,
    handleRecommendationSelect: handleAiRecommendationSelect,
  } = useWorkbookAiRecommendations(mergedRows, effectiveFingerprint);

  const {
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    resolvedCategoryName,
    handleSave,
  } = useWorkbookSave({
    user,
    rowsToSave: rows,
    selectedFileName,
    workbookFingerprint,
    tableNameMode,
    customTableName: effectiveCustomTableName,
    onSaved: upsertOfficeProductCatalogItem,
  });

  const { cards: catalogCards, registeredCount } = buildOfficeProductDataCatalogModel(
    officeProductCatalogItems,
    pendingCustomCategories,
  );

  const canUploadFile = toTrimmedString(resolvedCategoryName).length > 0;
  const saveDisabledMessage =
    rows.length > 0 && !toTrimmedString(resolvedCategoryName)
      ? '저장하려면 먼저 사이드바에서 카테고리를 선택하세요.'
      : '';

  const { isDeletingData, handleResetRegisteredData, handleCatalogCardDelete } =
    useOfficeProductDataDeletion({
      user,
      activeCategoryName,
      onRemoved: removeOfficeProductCatalogItem,
      onActiveDataDeleted: resetWorkbook,
    });

  function handleCatalogCardSelect(card) {
    if (!isCardSelected(card)) {
      resetWorkbook();
    }

    handleCatalogSelect(card);
  }

  const tableNameCardProps = {
    customTableName,
    inputRef: customTableNameInputRef,
    onTableNameChange: handleCustomTableNameChange,
    showsTableNameInput: showsCustomTableNameInput,
    validationError: tableNameValidationError,
    canCreateTable,
    onCreateTable: handleCreateCustomTable,
  };

  const resultSectionProps = {
    rows,
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    filters,
    filterOptions,
    onFilterChange: handleFilterChange,
    onResetFilters: resetFilters,
    sortState,
    onSortChange: setSortState,
    onShadowToggle: toggleShadow,
    onVisibleRowsShadowChange: setShadowForRows,
    onNoteChange: updateNote,
    onPriceChange: updatePrice,
    tableNameMode,
    aiRecommendations,
    aiAnalysisMode,
    aiIsAnalyzing,
    aiErrorMessage,
    aiActiveRecommendationId,
    onAiAnalyze: handleAiAnalyze,
    onAiRecommendationSelect: handleAiRecommendationSelect,
    aiDisabled: isExtracting || isMerging,
    onSave: handleSave,
    canSave,
    isSaving,
    saveErrorMessage,
    saveSuccessMessage,
    saveDisabledMessage,
    onResetData: handleResetRegisteredData,
    isResetting: isDeletingData,
  };

  return (
    <main className={styles.page}>
      {!showsCustomTableNameInput ? (
        <WorkbookReviewBanner
          categoryName={activeCategoryName}
          statusLabel={bannerStatusLabel}
          statusVariant={bannerStatusVariant}
        />
      ) : null}

      <div className={`${styles.layout} ${isSidebarCollapsed ? styles.layoutCollapsed : ''}`.trim()}>
        <WorkbookReviewSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          registeredCount={registeredCount}
          isLoading={isOfficeProductCatalogLoading}
          errorMessage={officeProductCatalogErrorMessage}
          cards={catalogCards}
          isCardSelected={isCardSelected}
          onCardSelect={handleCatalogCardSelect}
          onCardDelete={handleCatalogCardDelete}
        />

        <div className={styles.content}>
          <WorkbookReviewWorkspace
            tableNameMode={tableNameMode}
            isViewingRegisteredData={isViewingRegisteredData}
            tableNameCardProps={tableNameCardProps}
            result={result}
            warningRows={warningRows}
            selectedFileName={selectedFileName}
            onWorkbookChange={handleWorkbookChange}
            isExtracting={isExtracting}
            isMerged={isMerged}
            mergeStatusMessage={mergeStatusMessage}
            errorMessage={errorMessage}
            mergeError={mergeError}
            canUploadFile={canUploadFile}
            onFileSelected={processFile}
            isRegisteredProductDataLoading={isRegisteredProductDataLoading}
            registeredProductDataErrorMessage={registeredProductDataErrorMessage}
            resultSectionProps={resultSectionProps}
          />
        </div>
      </div>
    </main>
  );
}
