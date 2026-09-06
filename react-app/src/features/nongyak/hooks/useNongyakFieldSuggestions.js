import { useQuery } from '@tanstack/react-query';
import supabase from '../../../lib/supabaseClient';
import { fetchNongyakSuggestions } from '../services/nongyakSuggestionService';
import { useDebouncedValue } from './useDebouncedValue';

const SUGGESTION_DEBOUNCE_MS = 300;

export function useNongyakFieldSuggestions({ tab, officeCode, field, query }) {
  const debouncedQuery = useDebouncedValue(query, SUGGESTION_DEBOUNCE_MS);
  const trimmedQuery = debouncedQuery.trim();

  const result = useQuery({
    queryKey: ['nongyak-suggestions', tab, officeCode, field, trimmedQuery],
    queryFn: () =>
      fetchNongyakSuggestions(supabase, {
        tab,
        officeCode,
        field,
        query: trimmedQuery,
      }),
    enabled: trimmedQuery.length > 0,
  });

  return result.data || [];
}
