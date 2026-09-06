import { useQuery } from '@tanstack/react-query';
import supabase from '../../../lib/supabaseClient';
import { searchNongyakCatalog } from '../services/nongyakSearchService';
import { useDebouncedValue } from './useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

export function useNongyakSearchQuery({
  tab,
  officeCode,
  crop,
  productName,
  indictSymbl,
  nutirent,
  category,
  diseaseWeed,
}) {
  const debouncedCrop = useDebouncedValue(crop, SEARCH_DEBOUNCE_MS);
  const debouncedProductName = useDebouncedValue(productName, SEARCH_DEBOUNCE_MS);
  const debouncedIndictSymbl = useDebouncedValue(indictSymbl, SEARCH_DEBOUNCE_MS);
  const debouncedNutirent = useDebouncedValue(nutirent, SEARCH_DEBOUNCE_MS);
  const debouncedDiseaseWeed = useDebouncedValue(diseaseWeed, SEARCH_DEBOUNCE_MS);

  const result = useQuery({
    queryKey: [
      'nongyak-search',
      tab,
      officeCode,
      debouncedCrop,
      debouncedProductName,
      debouncedIndictSymbl,
      debouncedNutirent,
      category,
      debouncedDiseaseWeed,
    ],
    queryFn: () =>
      searchNongyakCatalog(supabase, {
        tab,
        officeCode,
        crop: debouncedCrop,
        productName: debouncedProductName,
        indictSymbl: debouncedIndictSymbl,
        nutirent: debouncedNutirent,
        category,
        diseaseWeed: debouncedDiseaseWeed,
      }),
  });

  return { ...result, data: result.data || [] };
}
