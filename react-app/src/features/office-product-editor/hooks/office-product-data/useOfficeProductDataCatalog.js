import { startTransition, useCallback } from 'react';

import {
  loadOfficeProductCatalog,
  resolveOfficeProductDataQuery,
} from '../../model/office-product-data/officeProductDataReadModel';
import { useAsyncFetch } from '../useAsyncFetch';

const DEFAULT_ERROR_MESSAGE = '등록 데이터를 불러오지 못했습니다.';

export function useOfficeProductDataCatalog(user) {
  const { officeCode, hasOffice } = resolveOfficeProductDataQuery({ user });
  const { data: items, isLoading, errorMessage, setData } = useAsyncFetch(
    () => loadOfficeProductCatalog(officeCode),
    [officeCode],
    { enabled: hasOffice, initialData: [], defaultErrorMessage: DEFAULT_ERROR_MESSAGE },
  );

  const removeItem = useCallback(
    (categoryName) => {
      startTransition(() => {
        setData((current) => current.filter((item) => item.categoryName !== categoryName));
      });
    },
    [setData],
  );

  const upsertItem = useCallback(
    (item) => {
      startTransition(() => {
        setData((current) => [
          item,
          ...current.filter((existing) => existing.categoryName !== item.categoryName),
        ]);
      });
    },
    [setData],
  );

  return { items, isLoading, errorMessage, removeItem, upsertItem };
}
