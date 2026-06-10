import { aggregateWorksheetRows } from './worksheetAggregationModel';
import { normalizeWorksheetRows } from './worksheetRowNormalizationModel';
import { analyzeWorksheetStructure } from './worksheetStructureModel';

export function extractSalesPriceSheetData(sheetRows) {
  const structure = analyzeWorksheetStructure(sheetRows);
  const normalizedRows = normalizeWorksheetRows(
    sheetRows,
    structure.columnMap,
    structure.dataStartRowIndex,
    structure.dataEndRowIndex,
  );

  return {
    headerRowIndex: structure.headerRowIndex,
    dataStartRowIndex: structure.dataStartRowIndex,
    dataEndRowIndex: structure.dataEndRowIndex,
    rows: aggregateWorksheetRows(normalizedRows),
    warnings: structure.warnings,
  };
}
