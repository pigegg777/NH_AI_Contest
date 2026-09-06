// office_product_datas 행에는 product_usage가 저장되지 않는다(마이그레이션
// 20260829092715). 재고상품 탭의 사용법도 product_code로 static_pesticide를
// 되짚어 읽으므로, 탭별 RPC는 이름만 다르고 같은 원본을 본다.
const RPC_NAME_BY_TAB = {
  inventory: 'get_office_pesticide_usage',
  catalog: 'get_static_pesticide_usage',
};

export async function fetchNongyakUsage(client, { tab, productCode }) {
  const rpcName = RPC_NAME_BY_TAB[tab];
  if (!rpcName) {
    throw new Error(`Unknown nongyak tab: ${tab}`);
  }

  const { data, error } = await client.rpc(rpcName, { p_product_code: productCode });

  if (error) throw error;
  return data || [];
}
