// scripts/seed-pesticides.js
// 계통농약 정보.xlsx (Result 시트) → static_pesticide seed JSON 변환
// node scripts/seed-pesticides.js

const XLSX = require('../react-app/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', 'data', '계통농약 정보.xlsx');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'pesticides-seed.json');

const COL = {
  product_code: 2,
  product_name: 10, // 상표명칭
  nutirent: 11, // 품목명칭
  product_category: 14, // 농약용도명
  updated_at: 16, // 수정일자 (YYYYMMDD)
};

function formatProductCode(value) {
  if (value == null) return null;
  if (typeof value === 'number') return BigInt(Math.round(value)).toString();
  return String(value).trim();
}

function formatUpdatedAt(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!/^\d{8}$/.test(s)) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

const wb = XLSX.readFile(EXCEL_PATH);
const ws = wb.Sheets['Result'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
const dataRows = rows.slice(1);

const seen = new Set();
const result = [];

for (const row of dataRows) {
  const product_code = formatProductCode(row[COL.product_code]);
  if (!product_code) continue;
  if (seen.has(product_code)) {
    console.warn(`중복 product_code 건너뜀: ${product_code}`);
    continue;
  }
  seen.add(product_code);

  result.push({
    product_code,
    product_name: row[COL.product_name] != null ? String(row[COL.product_name]).trim() : null,
    nutirent:
      row[COL.nutirent] != null ? String(row[COL.nutirent]).trim() : null,
    product_category:
      row[COL.product_category] != null ? String(row[COL.product_category]).trim() : null,
    product_usage: [],
    updated_at: formatUpdatedAt(row[COL.updated_at]),
  });
}

console.log(`총 ${result.length}개 파싱 완료`);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8');
console.log(`저장: ${OUTPUT_PATH}`);
