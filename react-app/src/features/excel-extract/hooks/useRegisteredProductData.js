import { startTransition, useEffect, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { fetchOfficeProductData } from '../services/officeProductDataService';

const DEFAULT_ERROR_MESSAGE = '등록 데이터를 불러오지 못했습니다.';

export function useRegisteredProductData({ user, categoryName, isEnabled }) {
  const officeCode = toTrimmedString(user?.office_code);
  const normalizedCategoryName = toTrimmedString(categoryName);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    if (!officeCode || !normalizedCategoryName || !isEnabled) {
      startTransition(() => {
        setData(null);
        setErrorMessage('');
      });
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    startTransition(() => {
      setData(null);
      setErrorMessage('');
    });

    fetchOfficeProductData({ officeCode, categoryName: normalizedCategoryName })
      .then((nextData) => {
        if (!isActive) {
          return;
        }

        startTransition(() => {
          setData(nextData);
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const nextMessage =
          error instanceof Error && error.message ? error.message : DEFAULT_ERROR_MESSAGE;

        startTransition(() => {
          setData(null);
          setErrorMessage(nextMessage);
        });
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [officeCode, normalizedCategoryName, isEnabled]);

  return {
    data,
    isLoading,
    errorMessage,
  };
}
