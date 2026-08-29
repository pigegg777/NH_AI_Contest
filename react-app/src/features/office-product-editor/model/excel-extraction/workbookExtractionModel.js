import { readWorkbookSheet } from '../../services/workbookSheetReader';
import { buildAggregatedWorksheetRows } from './worksheetRowsModel';
import { analyzeWorksheetStructure } from './worksheetStructureModel';

export async function readSalesPriceWorkbook(input) {
  const { sheetName, sheetRows } = await readWorkbookSheet(input);

  return {
    sheetName,
    ...extractSalesPriceSheetData(sheetRows),
  };
}

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
