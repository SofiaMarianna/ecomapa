import { MapContainer, TileLayer } from 'react-leaflet';
import EcoPointMarker from './EcoPointMarker.jsx';
import MapBoundsReporter from './MapBoundsReporter.jsx';

const INITIAL_CENTER = [-6.8891, -38.5612];

export default function EcoMap({
  points,
  selectedPointId,
  onBoundsChange,
  onSelect,
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
