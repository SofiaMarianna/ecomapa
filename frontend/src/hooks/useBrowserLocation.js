import { useEffect, useRef, useState } from 'react';

const LOCATION_TIMEOUT = 10000;

function getFallbackMessage(errorCode) {
  switch (errorCode) {
    case 1:
      return 'A permissão para acessar sua localização foi negada. O mapa foi iniciado usando Cajazeiras como referência.';
    case 2:
      return 'Sua localização está indisponível no momento. O mapa foi iniciado usando Cajazeiras como referência.';
    case 3:
      return 'A solicitação de localização excedeu o tempo limite. O mapa foi iniciado usando Cajazeiras como referência.';
    default:
      return 'Não foi possível obter sua localização. O mapa foi iniciado usando Cajazeiras como referência.';
  }
}

export default function useBrowserLocation() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const requestStartedRef = useRef(false);
  const isActiveRef = useRef(false);

  useEffect(() => {
    isActiveRef.current = true;

    if (!requestStartedRef.current) {
      requestStartedRef.current = true;

      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setStatus('error');
        setErrorMessage(
          'Este navegador não oferece geolocalização. O mapa foi iniciado usando Cajazeiras como referência.',
        );
      } else {
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!isActiveRef.current) {
                return;
              }

              const { latitude, longitude } = position.coords;
              if (
                !Number.isFinite(latitude)
                || !Number.isFinite(longitude)
                || latitude < -90
                || latitude > 90
                || longitude < -180
                || longitude > 180
              ) {
                setStatus('error');
                setErrorMessage(getFallbackMessage());
                return;
              }

              setLocation({ latitude, longitude });
              setStatus('success');
            },
            (error) => {
              if (!isActiveRef.current) {
                return;
              }

              setStatus('error');
              setErrorMessage(getFallbackMessage(error.code));
            },
            {
              enableHighAccuracy: false,
              timeout: LOCATION_TIMEOUT,
              maximumAge: 0,
            },
          );
        } catch {
          if (isActiveRef.current) {
            setStatus('error');
            setErrorMessage(getFallbackMessage());
          }
        }
      }
    }

    return () => {
      isActiveRef.current = false;
    };
  }, []);

  return { location, status, errorMessage };
}
