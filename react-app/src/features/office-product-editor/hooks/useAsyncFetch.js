import { startTransition, useEffect, useState } from 'react';

const DEFAULT_FETCH_ERROR = '데이터를 불러오지 못했습니다.';

/**
 * Generic async fetch lifecycle: isActive cleanup, startTransition wrapping, loading/error state.
 * Caller owns the fetchFn and must include all fetchFn dependencies in deps.
 *
 * @param {() => Promise<any>} fetchFn - Called when enabled and deps change.
 * @param {any[]} deps - Controls when the fetch re-runs.
 * @param {{ enabled?: boolean, initialData?: any, defaultErrorMessage?: string }} options
 */
// eslint-disable-next-line react-hooks/exhaustive-deps
export function useAsyncFetch(fetchFn, deps, { enabled = true, initialData = null, defaultErrorMessage = DEFAULT_FETCH_ERROR } = {}) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    if (!enabled) {
      startTransition(() => {
        setData(initialData);
        setErrorMessage('');
      });
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    startTransition(() => {
      setData(initialData);
      setErrorMessage('');
    });

    fetchFn()
      .then((result) => {
        if (!isActive) {
          return;
        }

        startTransition(() => {
          setData(result);
          setErrorMessage('');
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const nextMessage =
          error instanceof Error && error.message ? error.message : defaultErrorMessage;

        startTransition(() => {
          setData(initialData);
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
    // deps is controlled by caller — intentional dynamic dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, errorMessage, setData };
}
