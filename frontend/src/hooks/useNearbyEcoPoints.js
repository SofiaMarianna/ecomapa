import { useEffect, useRef, useState } from 'react';
import { getNearbyEcoPoints } from '../services/api.js';

export default function useNearbyEcoPoints(location, enabled) {
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  useEffect(() => {
    if (
      !enabled ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;

    setPoints([]);
    setError(null);
    setIsLoading(true);

    getNearbyEcoPoints(latitude, longitude, { signal: controller.signal })
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
  }, [enabled, latitude, longitude, retryCount]);

  return {
    points,
    isLoading,
    error,
    retry: () => setRetryCount((count) => count + 1),
  };
}
