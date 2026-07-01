import { toTrimmedString } from '../../../common/utils/text';
import { fetchOfficeProductData } from '../services/office-product-data/officeProductDataReadService';
import { useAsyncFetch } from './useAsyncFetch';

const DEFAULT_ERROR_MESSAGE = '등록 데이터를 불러오지 못했습니다.';

export function useRegisteredProductData({ user, categoryName, isEnabled }) {
  const officeCode = toTrimmedString(user?.office_code);
  const normalizedCategoryName = toTrimmedString(categoryName);
  const enabled = Boolean(officeCode && normalizedCategoryName && isEnabled);

  const { data, isLoading, errorMessage } = useAsyncFetch(
    () =>
      fetchOfficeProductData({
        officeCode,
        categoryName: normalizedCategoryName,
      }),
    [officeCode, normalizedCategoryName, isEnabled],
    { enabled, initialData: null, defaultErrorMessage: DEFAULT_ERROR_MESSAGE },
  );

  return { data, isLoading, errorMessage };
}
