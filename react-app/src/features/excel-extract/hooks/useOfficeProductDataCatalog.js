import { startTransition, useEffect, useState } from 'react';

import { toTrimmedString } from '../../../common/utils/text';
import { fetchOfficeProductDataCatalog } from '../services/officeProductDataService';

const DEFAULT_ERROR_MESSAGE = '등록 데이터를 불러오지 못했습니다.';

export function useOfficeProductDataCatalog(user) {
  const officeCode = toTrimmedString(user?.office_code);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(() => Boolean(officeCode));
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    if (!officeCode) {
      startTransition(() => {
        setItems([]);
        setErrorMessage('');
      });
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    startTransition(() => {
      setItems([]);
      setErrorMessage('');
    });

    fetchOfficeProductDataCatalog({ officeCode })
      .then((nextItems) => {
        if (!isActive) {
          return;
        }

        startTransition(() => {
          setItems(Array.isArray(nextItems) ? nextItems : []);
          setErrorMessage('');
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const nextMessage =
          error instanceof Error && error.message ? error.message : DEFAULT_ERROR_MESSAGE;

        startTransition(() => {
          setItems([]);
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
  }, [officeCode]);

  return {
    items,
    isLoading,
    errorMessage,
  };
}

