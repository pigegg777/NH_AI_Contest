import { NONGYAK_ALL_CATEGORY } from '../model/nongyakCardFields';

// 재고상품 탭은 로그인한 사업장의 office_product_datas 행 중 large_category가
// '농약'인 것을, 전체상품 탭은 static_pesticide 중 product_category가 농약 용도인
// 행만 본다(비료 계열 제외). 두 범위 모두 RPC 쪽에서 정해진다.
//
// crop과 diseaseWeed를 함께 보내면 RPC가 같은 사용법 행에서 둘 다 찾는다.
// 상품 어딘가에 그 작물이 있고 다른 어딘가에 그 병해충이 있는 것으로는 안 된다.
const RPC_NAME_BY_TAB = {
  inventory: 'search_office_pesticide_products',
  catalog: 'search_static_pesticide',
};

function toNullableText(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

function toNullableCategory(value) {
  const text = String(value ?? '').trim();
  if (!text || text === NONGYAK_ALL_CATEGORY) return null;
  return text;
}

export async function searchNongyakCatalog(
  client,
  { tab, officeCode, crop, productName, indictSymbl, nutirent, category, diseaseWeed },
) {
  const rpcName = RPC_NAME_BY_TAB[tab];
  if (!rpcName) {
    throw new Error(`Unknown nongyak tab: ${tab}`);
  }

  const params = {
    p_crop: toNullableText(crop),
    p_product_name: toNullableText(productName),
    p_indict_symbl: toNullableText(indictSymbl),
    p_nutirent: toNullableText(nutirent),
    p_category: toNullableCategory(category),
    p_disease_weed: toNullableText(diseaseWeed),
  };

  if (tab === 'inventory') {
    params.p_office_code = toNullableText(officeCode);
  }

  const { data, error } = await client.rpc(rpcName, params);

  if (error) throw error;
  return data || [];
}
