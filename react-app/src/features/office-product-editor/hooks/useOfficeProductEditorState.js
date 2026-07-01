import { toTrimmedString } from '../../../common/utils/text';
import { useActiveCategoryData } from './useActiveCategoryData';
import { useOfficeProductDataCatalog } from './useOfficeProductDataCatalog';
import { useOfficeProductDataDeletion } from './useOfficeProductDataDeletion';
import { useWorkbookAiRecommendations } from './useWorkbookAiRecommendations';
import { useWorkbookCatalogSelection } from './useWorkbookCatalogSelection';
import { useWorkbookExtraction } from './useWorkbookExtraction';
import { useWorkbookReviewTableState } from './useWorkbookReviewTableState';
import { useWorkbookSave } from './useWorkbookSave';
import { buildOfficeProductDataCatalogModel } from '../model/sidebar-catalog/sidebarCatalogBuildModel';

export function useOfficeProductEditorState(user) {
  // ── 레이어 1: 인프라 (독립) ─────────────────────────────────────
  const extraction = useWorkbookExtraction();
  const officeProductCatalog = useOfficeProductDataCatalog(user);

  // ── 레이어 2: 선택/카탈로그 ─────────────────────────────────────
  const selection = useWorkbookCatalogSelection({
    officeProductCatalogItems: officeProductCatalog.items,
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

  // ── 레이어 3: 데이터 ─────────────────────────────────────────────
  const { effectiveFingerprint, extractedRows } = activeCategoryData;

  const tableState = useWorkbookReviewTableState(extractedRows, effectiveFingerprint);

  const aiState = useWorkbookAiRecommendations(tableState.annotatedRows, effectiveFingerprint);

  const saveState = useWorkbookSave({
    user,
    rowsToSave: tableState.rows,
    selectedFileName: extraction.selectedFileName,
    workbookFingerprint: extraction.workbookFingerprint,
    tableNameMode,
    customTableName: selection.effectiveCustomTableName,
    onSaved: officeProductCatalog.upsertItem,
  });

  // ── 파생 상태 ────────────────────────────────────────────────────
  const saveDisabledMessage =
    tableState.rows.length > 0 && !toTrimmedString(saveState.resolvedCategoryName)
      ? '저장하려면 먼저 사이드바에서 카테고리를 선택하세요.'
      : '';

  const { cards, registeredCount } = buildOfficeProductDataCatalogModel(
    officeProductCatalog.items,
    selection.pendingCustomCategories,
  );

  const canUploadFile = toTrimmedString(saveState.resolvedCategoryName).length > 0;

  // ── 이벤트 핸들러 ────────────────────────────────────────────────
  function handleCatalogCardSelect(card) {
    if (!selection.isCardSelected(card)) {
      extraction.resetWorkbook();
    }
    selection.handleCatalogSelect(card);
  }

  // ── 반환 ─────────────────────────────────────────────────────────
  return {
    tableNameMode,
    showsCustomTableNameInput: selection.showsCustomTableNameInput,

    // 배너
    activeCategoryName: activeCategoryData.activeCategoryName,
    bannerStatusLabel: activeCategoryData.bannerStatusLabel,
    bannerStatusVariant: activeCategoryData.bannerStatusVariant,

    // 워크스페이스 분기
    isViewingRegisteredData: activeCategoryData.isViewingRegisteredData,
    activeCategory: {
      isRegisteredProductDataLoading: activeCategoryData.isRegisteredProductDataLoading,
      registeredProductDataErrorMessage: activeCategoryData.registeredProductDataErrorMessage,
    },

    // 사이드바
    catalog: {
      cards,
      registeredCount,
      isLoading: officeProductCatalog.isLoading,
      errorMessage: officeProductCatalog.errorMessage,
      isCardSelected: selection.isCardSelected,
      onCardSelect: handleCatalogCardSelect,
      onCardDelete: deletion.handleCatalogCardDelete,
    },

    // 추출/업로드
    extraction: {
      result: extraction.result,
      selectedFileName: extraction.selectedFileName,
      handleWorkbookChange: extraction.handleWorkbookChange,
      processFile: extraction.processFile,
    },

    // 업로드 섹션 전용
    upload: {
      canUploadFile,
      tableNameCardProps: {
        customTableName: selection.customTableName,
        inputRef: selection.customTableNameInputRef,
        onTableNameChange: selection.handleCustomTableNameChange,
        showsTableNameInput: selection.showsCustomTableNameInput,
        validationError: selection.tableNameValidationError,
        canCreateTable: selection.canCreateTable,
        onCreateTable: selection.handleCreateCustomTable,
      },
    },

    // 테이블
    table: {
      rows: tableState.rows,
      warningRows: tableState.warningRows,
      searchQuery: tableState.searchQuery,
      onSearchQueryChange: tableState.setSearchQuery,
      filters: tableState.filters,
      filterOptions: tableState.filterOptions,
      sortState: tableState.sortState,
      onSortChange: tableState.setSortState,
      onFilterChange: tableState.handleFilterChange,
      onResetFilters: tableState.resetFilters,
      onShadowToggle: tableState.toggleShadow,
      onVisibleRowsShadowChange: tableState.setShadowForRows,
      onNoteChange: tableState.updateNote,
      onPriceChange: tableState.updatePrice,
    },

    // AI
    ai: {
      recommendations: aiState.recommendations,
      analysisMode: aiState.analysisMode,
      activeRecommendationId: aiState.activeRecommendationId,
      handleAnalyze: aiState.handleAnalyze,
      handleRecommendationSelect: aiState.handleRecommendationSelect,
    },

    // 저장
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
