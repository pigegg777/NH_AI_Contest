// scripts/seed-fertilizer-materials.js
// "계통 4종복비 ,유기농업자재 단가.xlsx" (최종 시트) → static_pesticide seed JSON 변환
// (기존)상품코드 / (변경)표준상품코드를 각각 별도 product_code row로 생성
// (둘 다 있고 서로 다르면 2 row, 같으면 1 row, 하나만 있으면 1 row)
// node scripts/seed-fertilizer-materials.js

const XLSX = require('../react-app/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'data', '계통 4종복비 ,유기농업자재 단가.xlsx');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'fertilizer-materials-seed.json');

const COL = {
  category: 4, // 구분 (유기농업자재 / 제4종복비 / 미량요소비료 / 기타비료)
  name: 6, // 상품명
  oldCode: 8, // (기존)상품코드
  newCode: 9, // (변경)표준상품코드
  nutrient: 14, // 생산업자보증표상 보증성분(최소량)
};

function formatCode(value) {
  if (value == null) return null;
  if (typeof value === 'number') return BigInt(Math.round(value)).toString();
  const s = String(value).trim();
  return s || null;
}

const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets['최종'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
const dataRows = rows.slice(3); // 제목/단위/헤더 행 제외

const seen = new Set();
const result = [];

dataRows.forEach((row) => {
  const name = row[COL.name];
  const oldCode = formatCode(row[COL.oldCode]);
  const newCode = formatCode(row[COL.newCode]);
  if (!name || (!oldCode && !newCode)) return; // 끝부분 빈 행

  const category = (row[COL.category] || '').trim();
  const nutrient = (row[COL.nutrient] || '').trim() || null;

  const codes = [oldCode, newCode].filter((c, i, arr) => c && arr.indexOf(c) === i);

  codes.forEach((code) => {
    if (seen.has(code)) return;
    seen.add(code);
    result.push({
      product_code: code,
      product_name: String(name).trim(),
      nutirent: nutrient,
      product_category: category,
      product_usage: [],
      updated_at: null,
    });
  });
});

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
console.log(`원본 ${dataRows.length}행 → product_code ${result.length}개 row 생성`);
console.log(`출력: ${OUTPUT_PATH}`);
