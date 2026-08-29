import {
  loadRegisteredProductData,
  resolveOfficeProductDataQuery,
} from '../../model/office-product-data/officeProductDataReadModel';
import { useAsyncFetch } from '../useAsyncFetch';

const DEFAULT_ERROR_MESSAGE = '등록 데이터를 불러오지 못했습니다.';

export function useRegisteredProductData({ user, categoryName, isEnabled, refreshToken }) {
  const { officeCode, categoryName: normalizedCategoryName, hasCategory } =
    resolveOfficeProductDataQuery({ user, categoryName });
  const enabled = Boolean(hasCategory && isEnabled);

  const { data, isLoading, errorMessage } = useAsyncFetch(
    () =>
      loadRegisteredProductData({
        officeCode,
        categoryName: normalizedCategoryName,
      }),
    // refreshToken (the catalog item's updatedAt) is included so that
    // saving the currently-open category — which only bumps updatedAt —
    // refetches the just-persisted rows instead of leaving this stuck on
    // the pre-save snapshot while the review table's annotation cache
    // resets for the (also updatedAt-keyed) new fingerprint.
    [officeCode, normalizedCategoryName, isEnabled, refreshToken],
    { enabled, initialData: null, defaultErrorMessage: DEFAULT_ERROR_MESSAGE },
  );

  return { data, isLoading, errorMessage };
}
