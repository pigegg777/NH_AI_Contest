import { startTransition } from 'react';

import { toTrimmedString } from '../../../../common/utils/text';
import { fetchOfficeProductDataCatalog } from '../../services/office-product-data/officeProductDataReadService';
import { useAsyncFetch } from '../useAsyncFetch';

const DEFAULT_ERROR_MESSAGE = '등록 데이터를 불러오지 못했습니다.';

export function useOfficeProductDataCatalog(user) {
  const officeCode = toTrimmedString(user?.office_code);
  const { data: items, isLoading, errorMessage, setData } = useAsyncFetch(
    () => fetchOfficeProductDataCatalog({ officeCode }).then((r) => (Array.isArray(r) ? r : [])),
    [officeCode],
    { enabled: Boolean(officeCode), initialData: [], defaultErrorMessage: DEFAULT_ERROR_MESSAGE },
  );

  function removeItem(categoryName) {
    startTransition(() => {
      setData((current) => current.filter((item) => item.categoryName !== categoryName));
    });
  }

  function upsertItem(item) {
    startTransition(() => {
      setData((current) => [
        item,
        ...current.filter((existing) => existing.categoryName !== item.categoryName),
      ]);
    });
  }

  return { items, isLoading, errorMessage, removeItem, upsertItem };
}
