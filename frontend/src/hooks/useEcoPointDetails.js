import { useEffect, useRef, useState } from 'react';
import { getEcoPointById } from '../services/api.js';

export default function useEcoPointDetails(id) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;

    if (!id) {
      setDetails(null);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    setDetails(null);
    setError(null);
    setIsLoading(true);

    getEcoPointById(id, { signal: controller.signal })
      .then((result) => {
        if (currentRequestId === requestId.current) {
          setDetails(result);
        }
      })
      .catch((requestError) => {
        if (
          requestError.name === 'AbortError' ||
          currentRequestId !== requestId.current
        ) {
          return;
        }

        setError(requestError.message);
      })
      .finally(() => {
        if (currentRequestId === requestId.current) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [id, retryCount]);

  return {
    details,
    isLoading,
    error,
    retry: () => setRetryCount((count) => count + 1),
  };
}
