import { useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { CatalogSidebar } from '../components/CatalogSidebar';
import { HomeLink, CurrentDataBanner } from '../components/PageBanner';
import {
  EmptySelectionState,
  RegisteredDataReviewSection,
  UploadWorkspaceSection,
} from '../components/WorkbookReviewContent';
import { useOfficeProductDataCatalog } from '../hooks/useOfficeProductDataCatalog';
import { useRegisteredProductData } from '../hooks/useRegisteredProductData';
import { useWorkbookAiRecommendations } from '../hooks/useWorkbookAiRecommendations';
import { useWorkbookCatalogSelection } from '../hooks/useWorkbookCatalogSelection';
import { useWorkbookExtraction } from '../hooks/useWorkbookExtraction';
import { useWorkbookReviewTableState } from '../hooks/useWorkbookReviewTableState';
import { useWorkbookSave } from '../hooks/useWorkbookSave';
import { useWorkbookStaticMergeTrigger } from '../hooks/useWorkbookStaticMergeTrigger';
import { buildOfficeProductDataCatalogModel } from '../model/catalog/officeProductDataCatalogModel';
import { shouldUseStaticDataMerge } from '../model/save/workbookSaveModel';
import styles from './ExcelExtractWorkbookReviewPage.module.css';

const EMPTY_ROWS = [];

export default function ExcelExtractWorkbookReviewPage({ onGoHome, user }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    selectedFileName,
    workbookFingerprint,
    isExtracting,
    errorMessage,
    result,
    handleWorkbookChange,
    processFile,
  } = useWorkbookExtraction();

  const {
    items: officeProductCatalogItems,
    isLoading: isOfficeProductCatalogLoading,
    errorMessage: officeProductCatalogErrorMessage,
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

  const activeCategoryName =
    tableNameMode === 'fertilizer'
      ? '비료'
      : tableNameMode === 'pesticide'
        ? '농약'
        : tableNameMode === 'custom'
          ? toTrimmedString(effectiveCustomTableName)
          : '';

  const registeredCatalogItem =
    officeProductCatalogItems.find((item) => item.categoryName === activeCategoryName) ?? null;

  const isViewingRegisteredData = Boolean(registeredCatalogItem) && !result;

  const {
    data: registeredProductData,
    isLoading: isRegisteredProductDataLoading,
    errorMessage: registeredProductDataErrorMessage,
  } = useRegisteredProductData({
    user,
    categoryName: activeCategoryName,
    isEnabled: Boolean(registeredCatalogItem) && !result,
  });

  const extractedRows = result?.rows ?? registeredProductData?.rows ?? EMPTY_ROWS;
  const registeredFingerprint = registeredCatalogItem
    ? `registered:${activeCategoryName}:${registeredCatalogItem.updatedAt ?? ''}`
    : null;
  const effectiveFingerprint = workbookFingerprint ?? registeredFingerprint;

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
    handleStaticDataMerge,
  } = useWorkbookReviewTableState(extractedRows, effectiveFingerprint, {
    isStaticMergeEnabled,
  });

  useWorkbookStaticMergeTrigger({
    workbookFingerprint,
    hasResult: Boolean(result),
    isStaticMergeEnabled,
    isMerged,
    isMerging,
    handleStaticDataMerge,
  });

  const {
    recommendations: aiRecommendations,
    analysisMode: aiAnalysisMode,
    isAnalyzing: aiIsAnalyzing,
    errorMessage: aiErrorMessage,
    activeRecommendationId: aiActiveRecommendationId,
    highlightedRowIds: aiHighlightedRowIds,
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
    result,
    mergedRows,
    selectedFileName,
    workbookFingerprint,
    tableNameMode,
    customTableName: effectiveCustomTableName,
  });

  const { cards: catalogCards, registeredCount } = buildOfficeProductDataCatalogModel(
    officeProductCatalogItems,
    pendingCustomCategories,
  );

  const canUploadFile = toTrimmedString(resolvedCategoryName).length > 0;

  const bannerStatusLabel = result
    ? '신규 데이터 검토 중'
    : registeredCatalogItem
      ? '등록됨 · 편집 중'
      : '신규 등록';
  const bannerStatusVariant = result || registeredCatalogItem ? 'registered' : 'new';

  const tableNameCardProps = {
    tableNameMode,
    customTableName,
    inputRef: customTableNameInputRef,
    onTableNameChange: handleCustomTableNameChange,
    fixedCategoryName: activeCategoryName,
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
    highlightedRowIds: aiHighlightedRowIds,
    aiRecommendations,
    aiAnalysisMode,
    aiIsAnalyzing,
    aiErrorMessage,
    aiActiveRecommendationId,
    onAiAnalyze: handleAiAnalyze,
    onAiRecommendationSelect: handleAiRecommendationSelect,
    aiDisabled: isExtracting || isMerging,
  };

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.topbarLabel}>매출단가 검토</span>
          <h1 className={styles.topbarTitle}>엑셀 데이터 검토</h1>
        </div>
        <HomeLink onGoHome={onGoHome} />
      </header>

      <CurrentDataBanner
        categoryName={activeCategoryName}
        statusLabel={bannerStatusLabel}
        statusVariant={bannerStatusVariant}
      />

      <div className={`${styles.layout} ${isSidebarCollapsed ? styles.layoutCollapsed : ''}`.trim()}>
        <CatalogSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          registeredCount={registeredCount}
          isLoading={isOfficeProductCatalogLoading}
          errorMessage={officeProductCatalogErrorMessage}
          cards={catalogCards}
          isCardSelected={isCardSelected}
          onCardSelect={handleCatalogSelect}
        />

        <div className={styles.content}>
          {tableNameMode === '' ? (
            <EmptySelectionState />
          ) : isViewingRegisteredData ? (
            <RegisteredDataReviewSection
              selectedFileName={selectedFileName}
              onWorkbookChange={handleWorkbookChange}
              isExtracting={isExtracting}
              errorMessage={errorMessage}
              isRegisteredProductDataLoading={isRegisteredProductDataLoading}
              registeredProductDataErrorMessage={registeredProductDataErrorMessage}
              resultSectionProps={resultSectionProps}
            />
          ) : (
            <UploadWorkspaceSection
              tableNameCardProps={tableNameCardProps}
              result={result}
              warningRows={warningRows}
              selectedFileName={selectedFileName}
              onWorkbookChange={handleWorkbookChange}
              onSave={handleSave}
              canSave={canSave}
              isExtracting={isExtracting}
              isMerging={isMerging}
              aiIsAnalyzing={aiIsAnalyzing}
              isSaving={isSaving}
              isMerged={isMerged}
              mergeStatusMessage={mergeStatusMessage}
              errorMessage={errorMessage}
              mergeError={mergeError}
              saveErrorMessage={saveErrorMessage}
              saveSuccessMessage={saveSuccessMessage}
              canUploadFile={canUploadFile}
              onFileSelected={processFile}
              resultSectionProps={resultSectionProps}
            />
          )}
        </div>
      </div>
    </main>
  );
}
