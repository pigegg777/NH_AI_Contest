import { useEffect, useMemo } from 'react';
import { toTrimmedString } from '../../../common/utils/text';
import { useActiveCategoryData } from './sidebar-catalog/useActiveCategoryData';
import { useOfficeProductDataCatalog } from './office-product-data/useOfficeProductDataCatalog';
import { useOfficeProductDataDeletion } from './office-product-data/useOfficeProductDataDeletion';
import { useWorkbookAiRecommendationState } from './ai-recommendations/useWorkbookAiRecommendationState';
import { useMarketResearchState } from './market-research/useMarketResearchState';
import { useBulkNoteWriterState } from './bulk-note/useBulkNoteWriterState';
import { useWorkbookCatalogSelection } from './sidebar-catalog/useWorkbookCatalogSelection';
import { useWorkbookExtraction } from './excel-extranction/useWorkbookExtraction';
import { useWorkbookReviewTableState } from './review-table/useWorkbookReviewTableState';
import { useWorkbookSave } from './office-product-data/useWorkbookSave';
import { buildOfficeProductDataCatalogModel } from '../model/sidebar-catalog/sidebarCatalogBuildModel';
import { filterRowsByActiveRecommendation } from '../model/ai-recommendations/workbookAiRecommendationRowFilterModel';
import { shouldUseStaticDataMerge } from '../model/static-data-merge/staticDataMergeModel';
import {
  readStoredOfficeProductEditorDraft,
  writeStoredOfficeProductEditorDraft,
} from '../model/workspace-draft/officeProductEditorDraftStorageModel';

export function useOfficeProductEditorState(user) {
  const draftOfficeCode = toTrimmedString(user?.office_code);
  const initialDraft = useMemo(
    () =>
      readStoredOfficeProductEditorDraft(
        globalThis.sessionStorage,
        draftOfficeCode,
      ),
    [draftOfficeCode],
  );

  const extraction = useWorkbookExtraction(initialDraft?.extraction ?? null);
  const officeProductCatalog = useOfficeProductDataCatalog(user);

  const selection = useWorkbookCatalogSelection({
    officeProductCatalogItems: officeProductCatalog.items,
    initialSelectionState: initialDraft?.selection ?? null,
  });

  const { tableNameMode } = selection;

  const activeCategoryData = useActiveCategoryData({
    user,
    tableNameMode,
    effectiveCustomTableName: selection.effectiveCustomTableName,
    officeProductCatalogItems: officeProductCatalog.items,
    result: extraction.result,
    workbookFingerprint: extraction.workbookFingerprint,
  });

  const deletion = useOfficeProductDataDeletion({
    user,
    activeCategoryName: activeCategoryData.activeCategoryName,
    onRemoved: officeProductCatalog.removeItem,
    onActiveDataDeleted: extraction.resetWorkbook,
  });

  const { effectiveFingerprint, extractedRows } = activeCategoryData;
  const hasExtractedResult = Boolean(extraction.result);
  const isStaticMergeEnabled = shouldUseStaticDataMerge(tableNameMode);

  const tableState = useWorkbookReviewTableState(
    extractedRows,
    effectiveFingerprint,
    {
      hasResult: hasExtractedResult,
      isStaticMergeEnabled,
      tableNameMode,
    },
  );

  const aiState = useWorkbookAiRecommendationState(
    tableState.annotatedRows,
    effectiveFingerprint,
    user?.office_code,
    tableNameMode,
  );

  const marketResearchState = useMarketResearchState(user?.office_code, tableState.annotatedRows);

  const bulkNoteWriterState = useBulkNoteWriterState(
    user?.office_code,
    tableState.mergedRows,
    tableNameMode,
    tableState.updateNote,
  );

  const saveState = useWorkbookSave({
    user,
    rowsToSave: tableState.rows,
    selectedFileName: extraction.selectedFileName,
    workbookFingerprint: extraction.workbookFingerprint,
    tableNameMode,
    customTableName: selection.effectiveCustomTableName,
    onSaved: officeProductCatalog.upsertItem,
  });

  const saveDisabledMessage =
    tableState.rows.length > 0 && !toTrimmedString(saveState.resolvedCategoryName)
      ? '저장하려면 먼저 사이드바에서 카테고리를 선택하세요.'
      : '';

  const { cards, registeredCount } = buildOfficeProductDataCatalogModel(
    officeProductCatalog.items,
    selection.pendingCustomCategories,
  );

  const canUploadFile = toTrimmedString(saveState.resolvedCategoryName).length > 0;

  const visibleTableRows = useMemo(
    () =>
      filterRowsByActiveRecommendation(
        tableState.rows,
        aiState.recommendations,
        aiState.activeRecommendationId,
      ),
    [tableState.rows, aiState.recommendations, aiState.activeRecommendationId],
  );

  function handleResetFilters() {
    tableState.resetFilters();
    aiState.clearActiveRecommendation();
  }

  function handleCatalogCardSelect(card) {
    if (!selection.isCardSelected(card)) {
      extraction.resetWorkbook();
    }
    selection.handleCatalogSelect(card);
  }

  function handleCatalogCardDelete(card) {
    if (card?.isPendingCustom) {
      const isDeletingActivePendingCard = selection.isCardSelected(card);

      selection.handlePendingCustomCategoryDelete(card.categoryName);

      if (isDeletingActivePendingCard) {
        extraction.resetWorkbook();
      }

      return;
    }

    void deletion.handleCatalogCardDelete(card);
  }

  useEffect(() => {
    writeStoredOfficeProductEditorDraft(globalThis.sessionStorage, draftOfficeCode, {
      selection: {
        tableNameMode: selection.tableNameMode,
        customTableName: selection.customTableName,
        pendingCustomCategories: selection.pendingCustomCategories,
        activeCustomCategoryName: selection.activeCustomCategoryName,
      },
      extraction: {
        selectedFileName: extraction.selectedFileName,
        workbookFingerprint: extraction.workbookFingerprint,
        result: extraction.result,
      },
    });
  }, [
    draftOfficeCode,
    extraction.result,
    extraction.selectedFileName,
    extraction.workbookFingerprint,
    selection.activeCustomCategoryName,
    selection.customTableName,
    selection.pendingCustomCategories,
    selection.tableNameMode,
  ]);

  return {
    tableNameMode,
    showsCustomTableNameInput: selection.showsCustomTableNameInput,

    activeCategoryName: activeCategoryData.activeCategoryName,
    bannerStatusLabel: activeCategoryData.bannerStatusLabel,
    bannerStatusVariant: activeCategoryData.bannerStatusVariant,

    isViewingRegisteredData: activeCategoryData.isViewingRegisteredData,
    activeCategory: {
      isRegisteredProductDataLoading: activeCategoryData.isRegisteredProductDataLoading,
      registeredProductDataErrorMessage: activeCategoryData.registeredProductDataErrorMessage,
    },

    catalog: {
      cards,
      registeredCount,
      isLoading: officeProductCatalog.isLoading,
      errorMessage: officeProductCatalog.errorMessage,
      isCardSelected: selection.isCardSelected,
      onCardSelect: handleCatalogCardSelect,
      onCardDelete: handleCatalogCardDelete,
    },

    extraction: {
      result: extraction.result,
      selectedFileName: extraction.selectedFileName,
      handleWorkbookChange: extraction.handleWorkbookChange,
      processFile: extraction.processFile,
    },

    upload: {
      canUploadFile,
      tableNameCardProps: {
        customTableName: selection.customTableName,
        onTableNameChange: selection.handleCustomTableNameChange,
        showsTableNameInput: selection.showsCustomTableNameInput,
        validationError: selection.tableNameValidationError,
        onCreateTable: selection.handleCreateCustomTable,
      },
    },

    table: {
      rows: visibleTableRows,
      warningRows: tableState.warningRows,
      searchQuery: tableState.searchQuery,
      onSearchQueryChange: tableState.setSearchQuery,
      filters: tableState.filters,
      filterOptions: tableState.filterOptions,
      sortState: tableState.sortState,
      onSortChange: tableState.setSortState,
      onFilterChange: tableState.handleFilterChange,
      onResetFilters: handleResetFilters,
      onShadowToggle: tableState.toggleShadow,
      onVisibleRowsShadowChange: tableState.setShadowForRows,
      onNoteChange: tableState.updateNote,
      onPriceChange: tableState.updatePrice,
    },

    ai: {
      recommendations: aiState.recommendations,
      isLoading: aiState.isLoading,
      analysisMode: aiState.analysisMode,
      analysisMessage: aiState.analysisMessage,
      activeRecommendationId: aiState.activeRecommendationId,
      handleAnalyze: aiState.handleAnalyze,
      handleRecommendationSelect: aiState.handleRecommendationSelect,
      marketResearch: marketResearchState,
      bulkNoteWriter: {
        ...bulkNoteWriterState,
        rows: tableState.mergedRows,
      },
    },

    save: {
      canSave: saveState.canSave,
      isSaving: saveState.isSaving,
      saveErrorMessage: saveState.saveErrorMessage,
      saveSuccessMessage: saveState.saveSuccessMessage,
      saveDisabledMessage,
      handleSave: saveState.handleSave,
    },
  };
}
