import supabase from '../../../../lib/supabaseClient';
import { toTrimmedString } from '../../../../common/utils/text';
import {
  getProductDataEntries,
  removeProductUsageFromRows,
} from '../../utils/officeProductDataUtils';
import { fetchOfficeProductDataRow } from './officeProductDataRowService';

export async function saveOfficeProductData({
  user,
  rows,
  categoryName,
  sourceFileName,
}) {
  const officeCode = toTrimmedString(user?.office_code);
  const officeName = toTrimmedString(user?.office_name);
  const updatedWho = user?.employee_id;
  const normalizedCategoryName = toTrimmedString(categoryName);
  const normalizedRows = removeProductUsageFromRows(
    JSON.parse(JSON.stringify(Array.isArray(rows) ? rows : [])),
  );
  const updatedAt = new Date().toISOString();

  if (!officeCode || !officeName || !updatedWho) {
    throw new Error('저장에 필요한 사용자 정보가 부족합니다.');
  }

  if (!normalizedCategoryName) {
    throw new Error('테이블 이름을 먼저 선택해 주세요.');
  }

  if (normalizedRows.length === 0) {
    throw new Error('저장할 데이터가 없습니다.');
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
      (entry) =>
        toTrimmedString(entry?.category_name) !== normalizedCategoryName,
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
    .select('office_code, updated_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '데이터 저장에 실패했습니다.');
  }

  return {
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
