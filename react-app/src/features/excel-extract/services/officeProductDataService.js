import supabase from '../../../lib/supabaseClient';
import { toNullableTrimmedString, toTrimmedString } from '../../../common/utils/text';

function sanitizeRows(rows) {
  return JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : []));
}

function normalizeCatalogItem(item) {
  return {
    id: item?.id ?? null,
    officeCode: toTrimmedString(item?.office_code),
    officeName: toTrimmedString(item?.office_name),
    categoryName: toTrimmedString(item?.product_data_category_name),
    rowCount: Number.isFinite(item?.row_count) ? item.row_count : 0,
    sourceFileName: toNullableTrimmedString(item?.source_file_name),
    updatedAt: toNullableTrimmedString(item?.updated_at),
  };
}

export async function fetchOfficeProductDataCatalog({ officeCode }) {
  const normalizedOfficeCode = toTrimmedString(officeCode);

  if (!normalizedOfficeCode) {
    return [];
  }

  const { data, error } = await supabase
    .from('office_product_datas')
    .select(
      'id, office_code, office_name, product_data_category_name, row_count, source_file_name, updated_at',
    )
    .eq('office_code', normalizedOfficeCode)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message || '등록 데이터를 불러오지 못했습니다.');
  }

  return Array.isArray(data) ? data.map(normalizeCatalogItem) : [];
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

  const { data, error } = await supabase
    .from('office_product_datas')
    .upsert(
      {
        office_code: officeCode,
        office_name: officeName,
        product_data_category_name: normalizedCategoryName,
        product_data: normalizedRows,
        row_count: normalizedRows.length,
        source_file_name: toTrimmedString(sourceFileName) || null,
        updated_who: updatedWho,
        updated_at: updatedAt,
      },
      {
        onConflict: 'office_code,product_data_category_name',
      },
    )
    .select('id, updated_at, row_count')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '검토 데이터 저장에 실패했습니다.');
  }

  return data;
}
