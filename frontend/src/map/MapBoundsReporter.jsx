import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

export default function MapBoundsReporter({ onBoundsChange }) {
  const map = useMap();

  const reportBounds = () => {
    const bounds = map.getBounds();
    onBoundsChange({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  };

  useMapEvents({
    moveend: reportBounds,
  });

  useEffect(() => {
    reportBounds();
  }, [map]);

  return null;
}
