import { useEffect, useRef, useState } from 'react';
import { getEcoPointsByBounds } from '../services/api.js';

export default function useEcoPoints(bounds, enabled = true) {
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);
  const boundsKey = bounds
    ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
    : null;

  useEffect(() => {
    if (!enabled || !bounds || !boundsKey) {
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;
    const queryBounds = {
      west: bounds.west,
      south: bounds.south,
      east: bounds.east,
      north: bounds.north,
    };

    setPoints([]);
    setError(null);
    setIsLoading(true);

    getEcoPointsByBounds(queryBounds, { signal: controller.signal })
      .then((result) => {
        if (currentRequestId !== requestId.current) {
          return;
        }

        if (!Array.isArray(result)) {
          throw new Error('A API retornou uma lista de pontos inválida.');
        }

        setPoints(result);
      })
      .catch((requestError) => {
        if (
          requestError.name === 'AbortError' ||
          currentRequestId !== requestId.current
        ) {
          return;
        }

        setPoints([]);
        setError(requestError.message);
      })
      .finally(() => {
        if (currentRequestId === requestId.current) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (currentRequestId === requestId.current) {
        requestId.current += 1;
      }
    };
  }, [boundsKey, enabled, retryCount]);

  return {
    points,
    isLoading,
    error,
    retry: () => setRetryCount((count) => count + 1),
  };
}
