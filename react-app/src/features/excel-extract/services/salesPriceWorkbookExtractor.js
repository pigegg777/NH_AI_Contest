import { extractSalesPriceSheetData } from '../model/workbook-review/extraction/workbookExtractionModel';
import { readWorkbookSheet } from './workbookSheetReader';

export async function extractSalesPriceWorkbook(input) {
  const { sheetName, sheetRows } = await readWorkbookSheet(input);

  return {
    sheetName,
    ...extractSalesPriceSheetData(sheetRows),
  };
}
