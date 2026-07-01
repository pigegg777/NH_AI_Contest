import { useState } from 'react';

import { DataUploadSection } from '../components/DataUploadSection';
import { DataEditorSection } from '../components/DataEditorSection';
import { DataTableSection } from '../components/DataTableSection';
import { EditorSidebar } from '../components/sidebar/EditorSidebar';
import { HeaderSection } from '../components/header/HeaderSection';
import uploadPanelStyles from '../components/DataUploadSection.module.css';
import { useOfficeProductEditorState } from '../hooks/useOfficeProductEditorState';
import styles from './OfficeProductEditorPage.module.css';

function EmptySelectionState() {
  return (
    <div className={uploadPanelStyles.emptySelectionState}>
      <p className={uploadPanelStyles.emptySelectionTitle}>
        새 테이블을 등록해주세요
      </p>
      <p className={uploadPanelStyles.emptySelectionHint}>
        등록 데이터를 선택하거나 추가하세요
      </p>
    </div>
  );
}

export default function OfficeProductEditorPage({ user }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const {
    tableNameMode,
    showsCustomTableNameInput,
    activeCategoryName,
    bannerStatusLabel,
    bannerStatusVariant,
    isViewingRegisteredData,
    activeCategory,
    catalog,
    extraction,
    upload,
    table,
    ai,
    save,
  } = useOfficeProductEditorState(user);

  const editorResultProps = {
    rows: table.rows,
    aiRecommendations: ai.recommendations,
    aiAnalysisMode: ai.analysisMode,
    aiActiveRecommendationId: ai.activeRecommendationId,
    onAiAnalyze: ai.handleAnalyze,
    onAiRecommendationSelect: ai.handleRecommendationSelect,
  };

  const uploadResultSectionProps = {
    rows: table.rows,
    searchQuery: table.searchQuery,
    onSearchQueryChange: table.onSearchQueryChange,
    filters: table.filters,
    filterOptions: table.filterOptions,
    onFilterChange: table.onFilterChange,
    onResetFilters: table.onResetFilters,
    sortState: table.sortState,
    onSortChange: table.onSortChange,
    tableNameMode,
    onShadowToggle: table.onShadowToggle,
    onVisibleRowsShadowChange: table.onVisibleRowsShadowChange,
    onNoteChange: table.onNoteChange,
    onPriceChange: table.onPriceChange,
    aiRecommendations: ai.recommendations,
    aiAnalysisMode: ai.analysisMode,
    aiActiveRecommendationId: ai.activeRecommendationId,
    onAiAnalyze: ai.handleAnalyze,
    onAiRecommendationSelect: ai.handleRecommendationSelect,
    onSave: save.handleSave,
    canSave: save.canSave,
    isSaving: save.isSaving,
    saveErrorMessage: save.saveErrorMessage,
    saveSuccessMessage: save.saveSuccessMessage,
    saveDisabledMessage: save.saveDisabledMessage,
  };

  function renderWorkspace() {
    if (tableNameMode === '') {
      return <EmptySelectionState />;
    }

    if (isViewingRegisteredData) {
      return (
        <>
          <DataEditorSection
            onWorkbookChange={extraction.handleWorkbookChange}
            isRegisteredProductDataLoading={
              activeCategory.isRegisteredProductDataLoading
            }
            registeredProductDataErrorMessage={
              activeCategory.registeredProductDataErrorMessage
            }
            fileWarnings={extraction.result?.warnings}
            warningRows={table.warningRows}
            resultSectionProps={editorResultProps}
            saveSectionProps={{
              handleSave: save.handleSave,
              canSave: save.canSave,
              isSaving: save.isSaving,
              saveDisabledMessage: save.saveDisabledMessage,
              saveErrorMessage: save.saveErrorMessage,
              saveSuccessMessage: save.saveSuccessMessage,
            }}
          />

          <DataTableSection
            rows={table.rows}
            searchQuery={table.searchQuery}
            onSearchQueryChange={table.onSearchQueryChange}
            filters={table.filters}
            filterOptions={table.filterOptions}
            onFilterChange={table.onFilterChange}
            onResetFilters={table.onResetFilters}
            sortState={table.sortState}
            onSortChange={table.onSortChange}
            tableNameMode={tableNameMode}
            onShadowToggle={table.onShadowToggle}
            onVisibleRowsShadowChange={table.onVisibleRowsShadowChange}
            onNoteChange={table.onNoteChange}
            onPriceChange={table.onPriceChange}
          />
        </>
      );
    }

    return (
      <>
        <DataUploadSection
          tableNameCardProps={upload.tableNameCardProps}
          result={extraction.result}
          warningRows={table.warningRows}
          selectedFileName={extraction.selectedFileName}
          onWorkbookChange={extraction.handleWorkbookChange}
          canUploadFile={upload.canUploadFile}
          onFileSelected={extraction.processFile}
          resultSectionProps={uploadResultSectionProps}
        />
        {extraction.result ? (
          <DataTableSection
            rows={table.rows}
            searchQuery={table.searchQuery}
            onSearchQueryChange={table.onSearchQueryChange}
            filters={table.filters}
            filterOptions={table.filterOptions}
            onFilterChange={table.onFilterChange}
            onResetFilters={table.onResetFilters}
            sortState={table.sortState}
            onSortChange={table.onSortChange}
            tableNameMode={tableNameMode}
            onShadowToggle={table.onShadowToggle}
            onVisibleRowsShadowChange={table.onVisibleRowsShadowChange}
            onNoteChange={table.onNoteChange}
            onPriceChange={table.onPriceChange}
          />
        ) : null}
      </>
    );
  }

  return (
    <main className={styles.page}>
      <HeaderSection
        activeCategoryName={activeCategoryName}
        bannerStatusLabel={bannerStatusLabel}
        bannerStatusVariant={bannerStatusVariant}
        isViewingRegisteredData={isViewingRegisteredData}
        saveProps={{
          handleSave: save.handleSave,
          canSave: save.canSave,
          isSaving: save.isSaving,
          saveDisabledMessage: save.saveDisabledMessage,
          saveErrorMessage: save.saveErrorMessage,
          saveSuccessMessage: save.saveSuccessMessage,
        }}
      />

      <div
        className={`${styles.layout} ${isSidebarCollapsed ? styles.layoutCollapsed : ''}`.trim()}
      >
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() =>
            setIsSidebarCollapsed((collapsed) => !collapsed)
          }
          registeredCount={catalog.registeredCount}
          isLoading={catalog.isLoading}
          errorMessage={catalog.errorMessage}
          cards={catalog.cards}
          isCardSelected={catalog.isCardSelected}
          onCardSelect={catalog.onCardSelect}
          onCardDelete={catalog.onCardDelete}
        />
        <div className={styles.content}>{renderWorkspace()}</div>
      </div>
    </main>
  );
}
