// scripts/seed-fertilizers.js
// 계통 비료 정보 Excel → JSON 변환 스크립트
// node scripts/seed-fertilizers.js

const XLSX = require('../react-app/node_modules/xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '..', '계통 비료정보.xlsx');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'fertilizers-seed.json');

// 공급업체 컬럼 인덱스 (시트별로 다름)
const SUPPLIER_COLS_SHEET1 = ['__EMPTY_10','__EMPTY_11','__EMPTY_12','__EMPTY_13','__EMPTY_14','__EMPTY_15'];
const SUPPLIER_COLS_SHEET2 = ['__EMPTY_10']; // 시트2는 __EMPTY_11이 비고

// 공급업체명 정규화 맵
const SUPPLIER_NORMALIZE = {
  '남해':     '남해화학',
  '㈜풍농':   '풍농',
  '㈜조비':   '조비',
  'KG':       'KG케미칼',
  '한국협화':  '협화',
};

function normalizeSupplier(name) {
  const trimmed = name.trim();
  return SUPPLIER_NORMALIZE[trimmed] || trimmed;
}

function parseSuppliers(row, supplierCols) {
  const raw = supplierCols
    .map(col => row[col])
    .filter(v => v && String(v).trim() !== '')
    .map(v => String(v).trim());

  // 콤마 포함 셀 분리 ("남해화학, 풍농, 협화" → ["남해화학","풍농","협화"])
  const expanded = raw.flatMap(v =>
    v.includes(',') ? v.split(',').map(s => s.trim()).filter(Boolean) : [v]
  );

  // 정규화 + 중복 제거
  const normalized = [...new Set(expanded.map(normalizeSupplier))];
  return normalized.filter(Boolean);
}

function parseSpec(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // 숫자만 오면 "20" → "20kg" 로 변환
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}kg`;
  return s;
}

function parseRow(row, categoryKey, supplierCols, sheetCategory) {
  const product_code = row['__EMPTY_2'];
  const product_name = row['__EMPTY_3'];

  // 필수값 없으면 null 반환 (헤더행, 빈행 제거)
  if (!product_code || !product_name) return null;
  if (String(product_name).includes('비 종')) return null; // 헤더행
  if (String(product_code).includes('상품코드')) return null;

  const suppliers = parseSuppliers(row, supplierCols);

  return {
    product_code:    String(product_code).trim(),
    product_name:    String(product_name).trim(),
    category:        String(row[categoryKey] || '').trim() || null,
    sheet_category:  sheetCategory,          // '일반' | '원예'
    spec:            parseSpec(row['__EMPTY_5']),
    nutrient:        row['__EMPTY_4'] ? String(row['__EMPTY_4']).trim() : null,
    contract_status: row['__EMPTY'] ? String(row['__EMPTY']).trim() : null,
    subsidy_yn:      row['__EMPTY_1'] ? String(row['__EMPTY_1']).trim() : null,
    price_retail:    typeof row['__EMPTY_6'] === 'number' ? row['__EMPTY_6'] : null,
    price_subsidy:   typeof row['__EMPTY_7'] === 'number' ? row['__EMPTY_7'] : null,
    price_discount:  typeof row['__EMPTY_8'] === 'number' ? row['__EMPTY_8'] : null,
    price_tax:       typeof row['__EMPTY_9'] === 'number' ? Math.round(row['__EMPTY_9']) : null,
    suppliers:       suppliers,
    img_url:         null,
    product_url:     null,
  };
}

function processSheet(wb, sheetName, categoryKey, supplierCols, sheetCategory) {
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.warn(`시트 없음: ${sheetName}`); return []; }

  const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  const results = [];

  // 앞 4행은 헤더/타이틀 → 5번째 행(index 4)부터 데이터
  for (let i = 4; i < rows.length; i++) {
    const parsed = parseRow(rows[i], categoryKey, supplierCols, sheetCategory);
    if (parsed) results.push(parsed);
  }

  return results;
}

// ── 메인 실행 ──────────────────────────────────────
const wb = XLSX.readFile(EXCEL_PATH);
console.log('시트 목록:', wb.SheetNames);

const sheet1 = processSheet(wb, '2-1무기질비료(일반)',  '[붙임2-1]', SUPPLIER_COLS_SHEET1, '일반');
const sheet2 = processSheet(wb, '2-2무기질비료(원예)',  '[붙임2-2]', SUPPLIER_COLS_SHEET2, '원예');

const all = [...sheet1, ...sheet2];

// 중복 product_code 확인
const codes = all.map(p => p.product_code);
const duplicates = codes.filter((c, i) => codes.indexOf(c) !== i);
if (duplicates.length > 0) {
  console.warn('⚠️  중복 product_code:', duplicates);
}

console.log(`\n✅ 파싱 완료`);
console.log(`  시트1 (일반): ${sheet1.length}개`);
console.log(`  시트2 (원예): ${sheet2.length}개`);
console.log(`  총: ${all.length}개`);

// 공급업체 분포 출력
const allSuppliers = all.flatMap(p => p.suppliers);
const supplierCount = {};
allSuppliers.forEach(s => { supplierCount[s] = (supplierCount[s] || 0) + 1; });
console.log('\n공급업체 분포:');
Object.entries(supplierCount)
  .sort((a,b) => b[1]-a[1])
  .forEach(([s,c]) => console.log(`  ${s}: ${c}개`));

// 이미지 없는 항목 수
const noImg = all.filter(p => !p.img_url).length;
console.log(`\n이미지 없음: ${noImg}개 (전체 ${all.length}개)`);

// 샘플 출력
console.log('\n--- 샘플 3개 ---');
all.slice(0,3).forEach(p => console.log(JSON.stringify(p, null, 2)));

// JSON 저장
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(all, null, 2), 'utf-8');
console.log(`\n💾 저장: ${OUTPUT_PATH}`);
