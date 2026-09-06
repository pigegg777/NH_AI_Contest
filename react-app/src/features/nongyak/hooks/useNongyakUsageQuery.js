import { useQuery } from '@tanstack/react-query';
import supabase from '../../../lib/supabaseClient';
import { fetchNongyakUsage } from '../services/nongyakUsageLoader';

export function useNongyakUsageQuery({ tab, productCode, enabled }) {
  const result = useQuery({
    queryKey: ['nongyak-usage', tab, productCode],
    queryFn: () => fetchNongyakUsage(supabase, { tab, productCode }),
    enabled: Boolean(enabled && productCode),
  });

  return { ...result, data: result.data || [] };
}
