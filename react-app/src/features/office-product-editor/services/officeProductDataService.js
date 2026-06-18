import supabase from '../../../lib/supabaseClient';
import { toNullableTrimmedString, toTrimmedString } from '../../../common/utils/text';

function sanitizeRows(rows) {
  return JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : []));
}

function getProductDataEntries(row) {
  return Array.isArray(row?.product_data) ? row.product_data : [];
}

function findEntry(entries, categoryName) {
  return entries.find((entry) => toTrimmedString(entry?.category_name) === categoryName) ?? null;
}

function normalizeCatalogEntry(row, entry) {
  return {
    id: row?.id ?? null,
    officeCode: toTrimmedString(row?.office_code),
    officeName: toTrimmedString(row?.office_name),
    categoryName: toTrimmedString(entry?.category_name),
    rowCount: Number.isFinite(entry?.row_count) ? entry.row_count : 0,
    sourceFileName: toNullableTrimmedString(entry?.source_file_name),
    updatedAt: toNullableTrimmedString(entry?.updated_at),
  };
}

function normalizeEntryRows(categoryName, rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...(row ?? {}),
    product_category_name: toTrimmedString(row?.product_category_name) || categoryName,
  }));
}

function normalizeProductDataEntry(row, entry) {
  const categoryName = toTrimmedString(entry?.category_name);

  return {
    ...normalizeCatalogEntry(row, entry),
    rows: normalizeEntryRows(categoryName, entry?.rows),
  };
}

async function fetchOfficeProductDataRow(officeCode) {
  const { data, error } = await supabase
    .from('office_product_datas')
    .select('id, office_code, office_name, product_data')
    .eq('office_code', officeCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || '등록 데이터를 불러오지 못했습니다.');
  }

  return data;
}

export async function fetchAllOfficeProductRows({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_public_store_products', {
    p_office_code: normalizedOfficeCode,
  });

  if (error) {
    throw new Error(error.message || '상품 정보를 불러오지 못했습니다.');
  }

  return Array.isArray(data) ? data : [];
}

export async function fetchOfficeProductDataCatalog({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return [];
  }

  const row = await fetchOfficeProductDataRow(normalizedOfficeCode);

  if (!row) {
    return [];
  }

  return getProductDataEntries(row)
    .map((entry) => normalizeCatalogEntry(row, entry))
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function fetchOfficeProductDataEntries({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return [];
  }

  const row = await fetchOfficeProductDataRow(normalizedOfficeCode);

  if (!row) {
    return [];
  }

  return getProductDataEntries(row).map((entry) => normalizeProductDataEntry(row, entry));
}

export async function fetchOfficeProductData({ officeCode, categoryName }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (!normalizedOfficeCode || !normalizedCategoryName) {
    return null;
  }

  const row = await fetchOfficeProductDataRow(normalizedOfficeCode);

  if (!row) {
    return null;
  }

  const entry = findEntry(getProductDataEntries(row), normalizedCategoryName);

  if (!entry) {
    return null;
  }

  return {
    rows: normalizeEntryRows(normalizedCategoryName, entry.rows),
    sourceFileName: toNullableTrimmedString(entry.source_file_name),
    updatedAt: toNullableTrimmedString(entry.updated_at),
    rowCount: Number.isFinite(entry.row_count) ? entry.row_count : 0,
  };
}

export async function saveOfficeProductData({ user, rows, categoryName, sourceFileName }) {
  const officeCode = toTrimmedString(user?.office_code);
  const officeName = toTrimmedString(user?.office_name);
  const updatedWho = user?.id;
  const normalizedCategoryName = toTrimmedString(categoryName);
  const normalizedRows = sanitizeRows(rows);
  const updatedAt = new Date().toISOString();

  if (!officeCode || !officeName || !updatedWho) {
    throw new Error('저장에 필요한 사용자 정보가 부족합니다.');
  }

  if (!normalizedCategoryName) {
    throw new Error('테이블 이름을 먼저 선택해주세요.');
  }

  if (normalizedRows.length === 0) {
    throw new Error('저장할 검토 데이터가 없습니다.');
  }

  const existingRow = await fetchOfficeProductDataRow(officeCode);
  const existingEntries = getProductDataEntries(existingRow);
  const nextEntry = {
    category_name: normalizedCategoryName,
    updated_at: updatedAt,
    row_count: normalizedRows.length,
    source_file_name: toTrimmedString(sourceFileName) || null,
    rows: normalizedRows,
  };
  const nextEntries = [
    ...existingEntries.filter(
      (entry) => toTrimmedString(entry?.category_name) !== normalizedCategoryName,
    ),
    nextEntry,
  ];

  const { data, error } = await supabase
    .from('office_product_datas')
    .upsert(
      {
        office_code: officeCode,
        office_name: officeName,
        product_data: nextEntries,
        updated_who: updatedWho,
      },
      {
        onConflict: 'office_code',
      },
    )
    .select('id, updated_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '검토 데이터 저장에 실패했습니다.');
  }

  return {
    id: data.id,
    updated_at: updatedAt,
    row_count: normalizedRows.length,
  };
}

export async function deleteOfficeProductData({ officeCode, categoryName }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);
  const normalizedCategoryName = toTrimmedString(categoryName);

  if (!normalizedOfficeCode || !normalizedCategoryName) {
    throw new Error('삭제에 필요한 정보가 부족합니다.');
  }

  const existingRow = await fetchOfficeProductDataRow(normalizedOfficeCode);

  if (!existingRow) {
    return;
  }

  const existingEntries = getProductDataEntries(existingRow);
  const nextEntries = existingEntries.filter(
    (entry) => toTrimmedString(entry?.category_name) !== normalizedCategoryName,
  );

  if (nextEntries.length === existingEntries.length) {
    return;
  }

  const { error } = await supabase
    .from('office_product_datas')
    .update({ product_data: nextEntries })
    .eq('office_code', normalizedOfficeCode);

  if (error) {
    throw new Error(error.message || '데이터 삭제에 실패했습니다.');
  }
}
