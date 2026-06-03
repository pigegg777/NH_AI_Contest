import { useEffect, useState } from 'react';

import { fetchFertilizerData } from '../services/fertilizerLoader';

export function useFertilizerQuery() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const nextData = await fetchFertilizerData();

        if (!isMounted) {
          return;
        }

        setData(nextData);
        setError(null);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError instanceof Error ? nextError : new Error('비료 데이터를 불러오지 못했습니다.'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, error };
}
