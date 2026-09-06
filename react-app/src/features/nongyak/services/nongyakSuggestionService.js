const RPC_NAME_BY_TAB = {
  inventory: 'suggest_office_pesticide_field',
  catalog: 'suggest_static_pesticide_field',
};

export async function fetchNongyakSuggestions(client, { tab, officeCode, field, query }) {
  const rpcName = RPC_NAME_BY_TAB[tab];
  if (!rpcName) {
    throw new Error(`Unknown nongyak tab: ${tab}`);
  }

  const trimmedQuery = String(query ?? '').trim();
  if (!trimmedQuery) return [];

  const params = {
    p_field: field,
    p_query: trimmedQuery,
  };

  if (tab === 'inventory') {
    params.p_office_code = String(officeCode ?? '').trim() || null;
  }

  const { data, error } = await client.rpc(rpcName, params);

  if (error) throw error;
  return (data || []).map((row) => row.suggestion);
}
