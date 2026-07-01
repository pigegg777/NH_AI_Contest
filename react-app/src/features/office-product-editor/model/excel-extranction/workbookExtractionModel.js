import { buildAggregatedWorksheetRows } from './worksheetRowsModel';
import { analyzeWorksheetStructure } from './worksheetStructureModel';

export function extractSalesPriceSheetData(sheetRows) {
  const structure = analyzeWorksheetStructure(sheetRows);

  return {
    headerRowIndex: structure.headerRowIndex,
    dataStartRowIndex: structure.dataStartRowIndex,
    dataEndRowIndex: structure.dataEndRowIndex,
    rows: buildAggregatedWorksheetRows(sheetRows, structure),
    warnings: structure.warnings,
  };
}
