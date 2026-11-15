import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import EcoPointMarker from './EcoPointMarker.jsx';
import MapBoundsReporter from './MapBoundsReporter.jsx';

const INITIAL_CENTER = [-6.8891, -38.5612];

function FocusPointController({ point, onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    if (!point) {
      return;
    }

    map.setView(
      [point.latitude, point.longitude],
      Math.max(map.getZoom(), 15),
    );
    const bounds = map.getBounds();
    onBoundsChange({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  }, [map, onBoundsChange, point]);

  return null;
}

export default function EcoMap({
  points,
  selectedPointId,
  onBoundsChange,
  onSelect,
  focusPoint,
}) {
  return (
    <MapContainer
      className="eco-map"
      center={INITIAL_CENTER}
      zoom={14}
      scrollWheelZoom
      aria-label="Mapa interativo de pontos de coleta seletiva em Cajazeiras"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBoundsReporter onBoundsChange={onBoundsChange} />
      <FocusPointController point={focusPoint} onBoundsChange={onBoundsChange} />
      {points.map((point) => (
        <EcoPointMarker
          key={point.id}
          point={point}
          isSelected={selectedPointId === point.id}
          onSelect={onSelect}
        />
      ))}
    </MapContainer>
  );
}
