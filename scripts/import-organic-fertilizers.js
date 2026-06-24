const fs = require('fs');
const path = require('path');
const XLSX = require('../react-app/node_modules/xlsx');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'organic-fertilizers-seed.json');
const HEADER_ROW_INDEX = 4;
const INGREDIENT_SLOT_COUNT = 11;
const PAGE_SIZE = 1000;
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');

loadEnvFile(path.join(ROOT_DIR, '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_KEY are required.');
  process.exit(1);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = stripWrappingQuotes(rawValue);
  }
}

function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const firstChar = value[0];
    const lastChar = value[value.length - 1];
    if ((firstChar === '"' || firstChar === "'") && firstChar === lastChar) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function findOrganicWorkbookPath() {
  const workbookName = fs
    .readdirSync(DATA_DIR)
    .find((fileName) => fileName.endsWith('.xlsx') && fileName.includes('유기질'));

  if (!workbookName) {
    throw new Error('Organic fertilizer workbook not found in data directory.');
  }

  return path.join(DATA_DIR, workbookName);
}

function normalizeText(value) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text === '' ? null : text;
}

function normalizeHeader(value) {
  const text = normalizeText(value);
  return text ? text.replace(/\s+/g, ' ') : null;
}

function formatNumberString(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toString();
  }

  return normalizeText(value);
}

function parseSpec(value) {
  const text = formatNumberString(value);
  if (!text) {
    return null;
  }

  return /^\d+(\.\d+)?$/.test(text) ? `${text}kg` : text;
}

function createHeaderIndex(headerRow) {
  const indexByHeader = new Map();

  headerRow.forEach((headerValue, index) => {
    const normalized = normalizeHeader(headerValue);
    if (normalized) {
      indexByHeader.set(normalized, index);
    }
  });

  return indexByHeader;
}

function getRequiredColumnIndex(indexByHeader, candidates, sheetName) {
  for (const candidate of candidates) {
    if (indexByHeader.has(candidate)) {
      return indexByHeader.get(candidate);
    }
  }

  throw new Error(`Missing required column in "${sheetName}": ${candidates.join(' / ')}`);
}

function getOptionalColumnIndex(indexByHeader, candidates) {
  for (const candidate of candidates) {
    if (indexByHeader.has(candidate)) {
      return indexByHeader.get(candidate);
    }
  }

  return null;
}

function getIngredientColumns(indexByHeader) {
  const columns = [];

  for (let slot = 1; slot <= INGREDIENT_SLOT_COUNT; slot += 1) {
    const ingredientCandidates = [`원료명${slot}`];
    if (slot >= 10) {
      ingredientCandidates.push(`원료명 ${slot}`);
    }

    const ingredientIndex = getOptionalColumnIndex(indexByHeader, ingredientCandidates);
    const ratioIndex = getOptionalColumnIndex(indexByHeader, [`비율${slot}`]);

    if (ingredientIndex != null) {
      columns.push({ ingredientIndex, ratioIndex });
    }
  }

  return columns;
}

function buildNutrientText(row, ingredientColumns) {
  const parts = [];

  for (const { ingredientIndex, ratioIndex } of ingredientColumns) {
    const ingredientName = normalizeText(row[ingredientIndex]);
    if (!ingredientName) {
      continue;
    }

    const ratioText = ratioIndex == null ? null : formatNumberString(row[ratioIndex]);
    parts.push(ratioText ? `${ingredientName}(${ratioText}%)` : ingredientName);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

function normalizeProductNameForDuplicateCheck(productName) {
  return productName.replace(/\(벌크\)/g, '').replace(/\s+/g, ' ').trim();
}

function recordsMatchExceptProductName(left, right) {
  return (
    left.product_code === right.product_code &&
    left.category === right.category &&
    left.spec === right.spec &&
    left.nutrient === right.nutrient &&
    left.price_subsidy === right.price_subsidy &&
    JSON.stringify(left.suppliers) === JSON.stringify(right.suppliers) &&
    left.img_url === right.img_url &&
    left.product_url === right.product_url
  );
}

function choosePreferredDuplicateRecord(left, right) {
  const leftNormalizedName = normalizeProductNameForDuplicateCheck(left.product_name);
  const rightNormalizedName = normalizeProductNameForDuplicateCheck(right.product_name);

  if (leftNormalizedName !== rightNormalizedName) {
    return null;
  }

  if (!recordsMatchExceptProductName(left, right)) {
    return null;
  }

  const leftIsBulk = left.product_name.includes('(벌크)');
  const rightIsBulk = right.product_name.includes('(벌크)');

  if (leftIsBulk !== rightIsBulk) {
    return leftIsBulk ? right : left;
  }

  return left.product_name.length <= right.product_name.length ? left : right;
}

function parseSheetRecords(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const headerRow = rows[HEADER_ROW_INDEX];

  if (!headerRow) {
    throw new Error(`Header row not found in "${sheetName}"`);
  }

  const indexByHeader = createHeaderIndex(headerRow);
  const productCodeIndex = getRequiredColumnIndex(indexByHeader, ['상품코드'], sheetName);
  const productNameIndex = getRequiredColumnIndex(indexByHeader, ['상품명'], sheetName);
  const specIndex = getRequiredColumnIndex(indexByHeader, ['규격(kg)'], sheetName);
  const supplierIndex = getRequiredColumnIndex(indexByHeader, ['업체명'], sheetName);
  const ingredientColumns = getIngredientColumns(indexByHeader);
  const records = [];

  for (const row of rows.slice(HEADER_ROW_INDEX + 1)) {
    const productCode = normalizeText(row[productCodeIndex]);
    const productName = normalizeText(row[productNameIndex]);
    if (!productCode || !productName) {
      continue;
    }

    const supplier = normalizeText(row[supplierIndex]);

    records.push({
      product_code: productCode,
      product_name: productName,
      category: sheetName,
      spec: parseSpec(row[specIndex]),
      nutrient: buildNutrientText(row, ingredientColumns),
      price_subsidy: null,
      suppliers: supplier ? [supplier] : null,
      img_url: null,
      product_url: null,
    });
  }

  return records;
}

function collectWorkbookRecords(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const parsedRecords = workbook.SheetNames.flatMap((sheetName) => parseSheetRecords(workbook, sheetName));
  const recordsByCode = new Map();

  for (const record of parsedRecords) {
    const existingRecord = recordsByCode.get(record.product_code);
    if (!existingRecord) {
      recordsByCode.set(record.product_code, record);
      continue;
    }

    const preferredRecord = choosePreferredDuplicateRecord(existingRecord, record);
    if (!preferredRecord) {
      throw new Error(`Duplicate product_code with conflicting data found in workbook: ${record.product_code}`);
    }

    recordsByCode.set(record.product_code, preferredRecord);
  }

  return Array.from(recordsByCode.values());
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  return JSON.parse(responseText);
}

async function fetchExistingProductCodes() {
  const codes = new Set();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = `${SUPABASE_URL}/rest/v1/static_fertilizers?select=product_code&limit=${PAGE_SIZE}&offset=${offset}`;
    const rows = await fetchJson(url);

    rows.forEach((row) => {
      if (row.product_code) {
        codes.add(row.product_code);
      }
    });

    if (rows.length < PAGE_SIZE) {
      break;
    }
  }

  return codes;
}

async function insertBatch(records, batchNumber) {
  if (records.length === 0) {
    return;
  }

  await fetchJson(`${SUPABASE_URL}/rest/v1/static_fertilizers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(records),
  });

  console.log(`insert batch ${batchNumber}: ${records.length}`);
}

async function updateRecord(record) {
  await fetchJson(
    `${SUPABASE_URL}/rest/v1/static_fertilizers?product_code=eq.${encodeURIComponent(record.product_code)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
    }
  );
}

async function verifyRecordsExist(productCodes) {
  const existingCodes = await fetchExistingProductCodes();
  const missingCodes = productCodes.filter((productCode) => !existingCodes.has(productCode));

  if (missingCodes.length > 0) {
    throw new Error(`Verification failed. Missing product codes: ${missingCodes.slice(0, 20).join(', ')}`);
  }
}

async function main() {
  const workbookPath = findOrganicWorkbookPath();
  const records = collectWorkbookRecords(workbookPath);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(records, null, 2), 'utf8');

  const existingCodes = await fetchExistingProductCodes();
  const toInsert = records.filter((record) => !existingCodes.has(record.product_code));
  const toUpdate = records.filter((record) => existingCodes.has(record.product_code));

  console.log(`workbook: ${path.basename(workbookPath)}`);
  console.log(`records: ${records.length}`);
  console.log(`insert: ${toInsert.length}`);
  console.log(`update: ${toUpdate.length}`);
  console.log(`json: ${OUTPUT_PATH}`);

  if (DRY_RUN) {
    return;
  }

  for (let index = 0; index < toInsert.length; index += BATCH_SIZE) {
    const batch = toInsert.slice(index, index + BATCH_SIZE);
    await insertBatch(batch, Math.floor(index / BATCH_SIZE) + 1);
  }

  for (const record of toUpdate) {
    await updateRecord(record);
  }

  await verifyRecordsExist(records.map((record) => record.product_code));
  console.log('verification: ok');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
