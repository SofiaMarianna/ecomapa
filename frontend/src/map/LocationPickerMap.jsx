import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const INITIAL_CENTER = [-6.8891, -38.5612];

const locationIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapCenterUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 14));
  }, [center, map]);

  return null;
}

function MapLocationSelector({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

export default function LocationPickerMap({
  selectedLocation,
  center,
  onLocationSelect,
}) {
  const markerPosition = useMemo(
    () => (
      selectedLocation
        ? [selectedLocation.latitude, selectedLocation.longitude]
        : null
    ),
    [selectedLocation],
  );

  return (
    <MapContainer
      className="location-picker-map"
      center={INITIAL_CENTER}
      zoom={14}
      scrollWheelZoom
      aria-label="Mapa para selecionar a localização do ponto de coleta"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} />
      <MapLocationSelector onLocationSelect={onLocationSelect} />
      {markerPosition && (
        <Marker
          position={markerPosition}
          icon={locationIcon}
          alt="Localização selecionada para o ponto de coleta"
        />
      )}
    </MapContainer>
  );
}
