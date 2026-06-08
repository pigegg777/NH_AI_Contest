import fs from 'node:fs/promises';
import path from 'node:path';

import * as XLSX from 'xlsx';

import { extractSalesPriceWorkbook } from '../services/salesPriceWorkbookExtractor';

async function loadFixtureWorkbookBytes() {
  const filePath = path.resolve(process.cwd(), '../data/취급 비료 매출단가.xlsx');
  return new Uint8Array(await fs.readFile(filePath));
}

function buildWorkbookBuffer(rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet0');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}

function buildMockWorkbook() {
  return buildWorkbookBuffer([
    ['판매가격조회출력'],
    [],
    ['번호', '매출단가유형', '매출단가유형', '상품코드', '상품명', '상품구분', '규격', '매출단가', '대분류', '중분류', '소분류', '세분류', '상품제조업체코드', '상품제조업체명'],
    [1, '01', '조합원정상가', 'P-001', '테스트비료', '중본-과세-수탁매취', '20kg', 1000, '비료', '중분류A', '소분류A', '세분류A', 'M-1', '제조사A'],
    [2, '01', '조합원정상가', 'P-001', '테스트비료', '중본-영세-수탁매취', '20kg', 900, '비료', '중분류A', '소분류A', '세분류A', 'M-1', '제조사A'],
    [3, '02', '비조합원가', 'P-001', '테스트비료', '중본-과세-수탁매취', '20kg', 1100, '비료', '중분류A', '소분류A', '세분류A', 'M-2', '제조사B'],
    [4, '02', '비조합원가', 'P-001', '테스트비료', '중본-영세-수탁매취', '20kg', 990, '비료', '중분류A', '소분류A', '세분류A', 'M-2', '제조사B'],
    [5, '03', '제조사없음가', 'P-002', '제조사없음', '중본-과세-수탁매취', '10kg', 500, '비료', '중분류B', '소분류B', '세분류B', null, null],
  ]);
}

describe('extractSalesPriceWorkbook', () => {
  it('extracts folded tax and zero-tax prices from the real workbook fixture', async () => {
    const result = await extractSalesPriceWorkbook(await loadFixtureWorkbookBytes());

    expect(result.sheetName).toBe('Sheet0');
    expect(result.headerRowIndex).toBe(10);
    expect(result.dataStartRowIndex).toBe(11);
    expect(result.rows.length).toBeGreaterThan(0);

    const row = result.rows.find(
      (item) =>
        item.product_code === '2100031144112' &&
        item.sale_price_type_code === '01',
    );

    expect(row).toMatchObject({
      row_id: '2100031144112__01',
      product_code: '2100031144112',
      sale_price_type_code: '01',
      sale_price_type_name: '조합원정상가',
      product_name: '엔케이플러스인(NK+인)',
      tax_price: 14410,
      zero_tax_price: 13100,
      spec: '20kg',
      large_category: '비료',
      medium_category: '무기질비료(원예용)',
      small_category: '원예용비료',
      detail_category: '원예용비료',
      warnings: [],
    });
    expect(row.product_type_variants).toEqual(
      expect.arrayContaining(['중본-과세-수탁매취', '중본-영세-수탁매취']),
    );
    expect(row.manufacturer_list).toEqual([
      {
        manufacturer_code: '2910000206952',
        manufacturer_name: '남해화학',
      },
    ]);
    expect(row).not.toHaveProperty('manufacturer_display');
  });

  it('keeps separate result rows when sale price types differ for the same product code', async () => {
    const result = await extractSalesPriceWorkbook(buildMockWorkbook());
    const rows = result.rows.filter((item) => item.product_code === 'P-001');

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row_id: 'P-001__01',
          product_code: 'P-001',
          sale_price_type_code: '01',
          sale_price_type_name: '조합원정상가',
          tax_price: 1000,
          zero_tax_price: 900,
        }),
        expect.objectContaining({
          row_id: 'P-001__02',
          product_code: 'P-001',
          sale_price_type_code: '02',
          sale_price_type_name: '비조합원가',
          tax_price: 1100,
          zero_tax_price: 990,
        }),
      ]),
    );
  });

  it('dedupes manufacturers per key and returns null when manufacturer data is missing', async () => {
    const result = await extractSalesPriceWorkbook(buildMockWorkbook());

    const memberRow = result.rows.find(
      (item) => item.product_code === 'P-001' && item.sale_price_type_code === '01',
    );
    const missingManufacturerRow = result.rows.find(
      (item) => item.product_code === 'P-002' && item.sale_price_type_code === '03',
    );

    expect(memberRow.manufacturer_list).toEqual([
      {
        manufacturer_code: 'M-1',
        manufacturer_name: '제조사A',
      },
    ]);
    expect(missingManufacturerRow.manufacturer_list).toBeNull();
  });
});
