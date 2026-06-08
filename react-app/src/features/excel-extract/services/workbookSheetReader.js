import * as XLSX from 'xlsx';

async function toWorkbookInput(input) {
  if (input instanceof Uint8Array) {
    return input;
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  if (input && typeof input.arrayBuffer === 'function') {
    return new Uint8Array(await input.arrayBuffer());
  }

  throw new Error('Unsupported workbook input');
}

function sheetToRows(worksheet) {
  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
}

export async function readWorkbookSheet(input) {
  const workbookInput = await toWorkbookInput(input);
  const workbook = XLSX.read(workbookInput, { type: 'array' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Workbook does not contain any sheets');
  }

  return {
    sheetName,
    sheetRows: sheetToRows(workbook.Sheets[sheetName]),
  };
}
