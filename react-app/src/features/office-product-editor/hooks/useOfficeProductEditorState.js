import { useCallback, useEffect, useMemo } from 'react';
import { toTrimmedString } from '../../../common/utils/text';
import { useActiveCategoryData } from './sidebar-catalog/useActiveCategoryData';
import { useOfficeProductDataCatalog } from './office-product-data/useOfficeProductDataCatalog';
import { useOfficeProductDataDeletion } from './office-product-data/useOfficeProductDataDeletion';
import { useAiSimilarityExtractionState } from './ai-similarity-extraction/useAiSimilarityExtractionState';
import { useAiMarketResearchState } from './ai-market-research/useAiMarketResearchState';
import { useAiBulkNoteWriterState } from './ai-bulk-note/useAiBulkNoteWriterState';
import { useAiImageApplyState } from './ai-image-apply/useAiImageApplyState';
import { useWorkbookCatalogSelection } from './sidebar-catalog/useWorkbookCatalogSelection';
import { useWorkbookExtraction } from './excel-extraction/useWorkbookExtraction';
import { usePreviousDataCarryOver } from './office-product-data/usePreviousDataCarryOver';
import { useWorkbookReviewTableState } from './review-table/useWorkbookReviewTableState';
import { useWorkbookSave } from './office-product-data/useWorkbookSave';
import { buildOfficeProductDataCatalogModel } from '../model/sidebar-catalog/sidebarCatalogBuildModel';
import { filterRowsByActiveAiSimilarityExtractionMatch } from '../model/ai-similarity-extraction/aiSimilarityExtractionRowFilterModel';
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

  const { effectiveFingerprint, extractedRows, registeredRows } =
    activeCategoryData;
  const hasExtractedResult = Boolean(extraction.result);
  const isStaticMergeEnabled = shouldUseStaticDataMerge(tableNameMode);

  // Sits before the review table so the merchant sees the carried-over values in
  // the table and can still hand-edit them before saving.
  const carryOver = usePreviousDataCarryOver({
    newRows: extractedRows,
    previousRows: registeredRows,
    isReviewingNewWorkbook: hasExtractedResult,
    isCategoryRegistered: activeCategoryData.isViewingRegisteredData,
    workbookFingerprint: extraction.workbookFingerprint,
  });

  const tableState = useWorkbookReviewTableState(
    carryOver.rows,
    effectiveFingerprint,
    {
      hasResult: hasExtractedResult,
      isStaticMergeEnabled,
      tableNameMode,
    },
  );

  const aiState = useAiSimilarityExtractionState(
    tableState.annotatedRows,
    effectiveFingerprint,
    user?.office_code,
    tableNameMode,
  );

  const marketResearchState = useAiMarketResearchState(user?.office_code, tableState.annotatedRows);

  const bulkNoteWriterState = useAiBulkNoteWriterState({
    officeCode: user?.office_code,
    rows: tableState.mergedRows,
    tableNameMode,
    updateNote: tableState.updateNote,
    updatePrice: tableState.updatePrice,
    setShadowForRows: tableState.setShadowForRows,
    appendRows: tableState.appendRows,
    patchRows: tableState.patchRows,
  });

  const imageApplyState = useAiImageApplyState(
    user?.office_code,
    tableState.mergedRows,
    tableState.updateImgUrl,
  );

  const saveState = useWorkbookSave({
    user,
    rowsToSave: tableState.mergedRows,
    selectedFileName: extraction.selectedFileName,
    workbookFingerprint: extraction.workbookFingerprint,
    tableNameMode,
    customTableName: selection.effectiveCustomTableName,
    onSaved: officeProductCatalog.upsertItem,
    isStaticMergePending: tableState.isStaticMergeLoading,
  });

  const saveDisabledMessage =
    tableState.rows.length > 0 && !toTrimmedString(saveState.resolvedCategoryName)
      ? '저장하려면 먼저 사이드바에서 카테고리를 선택하세요.'
      : tableState.isStaticMergeLoading
        ? '정적 데이터를 불러오는 중입니다. 잠시 후 다시 시도하세요.'
        : '';

  const { cards, registeredCount } = useMemo(
    () =>
      buildOfficeProductDataCatalogModel(
        officeProductCatalog.items,
        selection.pendingCustomCategories,
      ),
    [officeProductCatalog.items, selection.pendingCustomCategories],
  );

  const canUploadFile = toTrimmedString(saveState.resolvedCategoryName).length > 0;

  const visibleTableRows = useMemo(
    () =>
      filterRowsByActiveAiSimilarityExtractionMatch(
        tableState.rows,
        aiState.recommendations,
        aiState.activeRecommendationId,
      ),
    [tableState.rows, aiState.recommendations, aiState.activeRecommendationId],
  );

  const handleResetFilters = useCallback(() => {
    tableState.resetFilters();
    aiState.clearActiveRecommendation();
  }, [tableState.resetFilters, aiState.clearActiveRecommendation]);

  const handleCatalogCardSelect = useCallback(
    (card) => {
      if (!selection.isCardSelected(card)) {
        extraction.resetWorkbook();
      }
      selection.handleCatalogSelect(card);
    },
    [selection.isCardSelected, selection.handleCatalogSelect, extraction.resetWorkbook],
  );

  const handleCatalogCardDelete = useCallback(
    (card) => {
      if (card?.isPendingCustom) {
        const isDeletingActivePendingCard = selection.isCardSelected(card);

        selection.handlePendingCustomCategoryDelete(card.categoryName);

        if (isDeletingActivePendingCard) {
          extraction.resetWorkbook();
        }

        return;
      }

      void deletion.handleCatalogCardDelete(card);
    },
    [
      selection.isCardSelected,
      selection.handlePendingCustomCategoryDelete,
      extraction.resetWorkbook,
      deletion.handleCatalogCardDelete,
    ],
  );

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

  const activeCategoryValue = useMemo(
    () => ({
      isRegisteredProductDataLoading: activeCategoryData.isRegisteredProductDataLoading,
      registeredProductDataErrorMessage: activeCategoryData.registeredProductDataErrorMessage,
    }),
    [
      activeCategoryData.isRegisteredProductDataLoading,
      activeCategoryData.registeredProductDataErrorMessage,
    ],
  );

  const catalogValue = useMemo(
    () => ({
      cards,
      registeredCount,
      isLoading: officeProductCatalog.isLoading,
      errorMessage: officeProductCatalog.errorMessage,
      isCardSelected: selection.isCardSelected,
      onCardSelect: handleCatalogCardSelect,
      onCardDelete: handleCatalogCardDelete,
    }),
    [
      cards,
      registeredCount,
      officeProductCatalog.isLoading,
      officeProductCatalog.errorMessage,
      selection.isCardSelected,
      handleCatalogCardSelect,
      handleCatalogCardDelete,
    ],
  );

  const extractionValue = useMemo(
    () => ({
      result: extraction.result,
      selectedFileName: extraction.selectedFileName,
      handleWorkbookChange: extraction.handleWorkbookChange,
      processFile: extraction.processFile,
    }),
    [
      extraction.result,
      extraction.selectedFileName,
      extraction.handleWorkbookChange,
      extraction.processFile,
    ],
  );

  const uploadValue = useMemo(
    () => ({
      canUploadFile,
      carryOver: {
        isOpen: carryOver.isDialogOpen,
        categoryName: activeCategoryData.activeCategoryName,
        carriedImageCount: carryOver.carriedImageCount,
        carriedNoteCount: carryOver.carriedNoteCount,
        carriedShadowCount: carryOver.carriedShadowCount,
        onChoose: carryOver.choose,
        onDismiss: carryOver.dismiss,
      },
      tableNameCardProps: {
        customTableName: selection.customTableName,
        onTableNameChange: selection.handleCustomTableNameChange,
        showsTableNameInput: selection.showsCustomTableNameInput,
        validationError: selection.tableNameValidationError,
        onCreateTable: selection.handleCreateCustomTable,
      },
    }),
    [
      canUploadFile,
      carryOver.isDialogOpen,
      carryOver.carriedImageCount,
      carryOver.carriedNoteCount,
      carryOver.carriedShadowCount,
      carryOver.choose,
      carryOver.dismiss,
      activeCategoryData.activeCategoryName,
      selection.customTableName,
      selection.handleCustomTableNameChange,
      selection.showsCustomTableNameInput,
      selection.tableNameValidationError,
      selection.handleCreateCustomTable,
    ],
  );

  const saveValue = useMemo(
    () => ({
      canSave: saveState.canSave,
      isSaving: saveState.isSaving,
      saveErrorMessage: saveState.saveErrorMessage,
      saveSuccessMessage: saveState.saveSuccessMessage,
      saveDisabledMessage,
      handleSave: saveState.handleSave,
    }),
    [
      saveState.canSave,
      saveState.isSaving,
      saveState.saveErrorMessage,
      saveState.saveSuccessMessage,
      saveDisabledMessage,
      saveState.handleSave,
    ],
  );

  const tableValue = useMemo(
    () => ({
      officeCode: draftOfficeCode,
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
      onImgUrlChange: tableState.updateImgUrl,
      onRemoveAppendedRow: tableState.removeAppendedRow,
    }),
    [
      draftOfficeCode,
      visibleTableRows,
      tableState.warningRows,
      tableState.searchQuery,
      tableState.setSearchQuery,
      tableState.filters,
      tableState.filterOptions,
      tableState.sortState,
      tableState.setSortState,
      tableState.handleFilterChange,
      handleResetFilters,
      tableState.toggleShadow,
      tableState.setShadowForRows,
      tableState.updateNote,
      tableState.updatePrice,
      tableState.updateImgUrl,
      tableState.removeAppendedRow,
    ],
  );

  const bulkNoteWriterValue = useMemo(
    () => ({
      ...bulkNoteWriterState,
      rows: tableState.mergedRows,
    }),
    [bulkNoteWriterState, tableState.mergedRows],
  );

  const imageApplyValue = useMemo(
    () => ({
      ...imageApplyState,
      rows: tableState.mergedRows,
    }),
    [imageApplyState, tableState.mergedRows],
  );

  const aiValue = useMemo(
    () => ({
      recommendations: aiState.recommendations,
      isLoading: aiState.isLoading,
      analysisMode: aiState.analysisMode,
      analysisMessage: aiState.analysisMessage,
      activeRecommendationId: aiState.activeRecommendationId,
      handleAnalyze: aiState.handleAnalyze,
      handleRecommendationSelect: aiState.handleRecommendationSelect,
      marketResearch: marketResearchState,
      bulkNoteWriter: bulkNoteWriterValue,
      imageApply: imageApplyValue,
    }),
    [
      aiState.recommendations,
      aiState.isLoading,
      aiState.analysisMode,
      aiState.analysisMessage,
      aiState.activeRecommendationId,
      aiState.handleAnalyze,
      aiState.handleRecommendationSelect,
      marketResearchState,
      bulkNoteWriterValue,
      imageApplyValue,
    ],
  );

  return {
    tableNameMode,
    showsCustomTableNameInput: selection.showsCustomTableNameInput,

    activeCategoryName: activeCategoryData.activeCategoryName,
    bannerStatusLabel: activeCategoryData.bannerStatusLabel,
    bannerStatusVariant: activeCategoryData.bannerStatusVariant,

    isViewingRegisteredData: activeCategoryData.isViewingRegisteredData,
    activeCategory: activeCategoryValue,

    catalog: catalogValue,

    extraction: extractionValue,

    upload: uploadValue,

    table: tableValue,

    ai: aiValue,

    save: saveValue,
  };
}
