import { useEffect, useRef } from 'react';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
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

function MapInteractionTracker({ onUserInteraction }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const handleInteraction = () => onUserInteraction();

    container.addEventListener('pointerdown', handleInteraction, true);
    container.addEventListener('touchstart', handleInteraction, true);
    container.addEventListener('wheel', handleInteraction, { passive: true });
    container.addEventListener('keydown', handleInteraction);

    return () => {
      container.removeEventListener('pointerdown', handleInteraction, true);
      container.removeEventListener('touchstart', handleInteraction, true);
      container.removeEventListener('wheel', handleInteraction);
      container.removeEventListener('keydown', handleInteraction);
    };
  }, [map, onUserInteraction]);

  return null;
}

function LocationController({ location, hasUserInteractedRef }) {
  const map = useMap();
  const appliedLocationRef = useRef(null);

  useEffect(() => {
    if (!location || hasUserInteractedRef.current) {
      return;
    }

    const locationKey = `${location.latitude},${location.longitude}`;
    if (appliedLocationRef.current === locationKey) {
      return;
    }

    appliedLocationRef.current = locationKey;
    map.setView([location.latitude, location.longitude], map.getZoom());
  }, [hasUserInteractedRef, location, map]);

  return null;
}

export default function EcoMap({
  points,
  selectedPointId,
  onBoundsChange,
  onSelect,
  focusPoint,
  location,
  locationStatus,
  locationErrorMessage,
  hasUserInteractedRef,
  onUserInteraction,
}) {
  return (
    <>
      <MapContainer
        className="eco-map"
        center={INITIAL_CENTER}
        zoom={14}
        scrollWheelZoom
        aria-label="Mapa interativo de pontos de coleta seletiva"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsReporter onBoundsChange={onBoundsChange} />
        <MapInteractionTracker onUserInteraction={onUserInteraction} />
        <LocationController
          location={location}
          hasUserInteractedRef={hasUserInteractedRef}
        />
        <FocusPointController point={focusPoint} onBoundsChange={onBoundsChange} />
        {location && (
          <CircleMarker
            center={[location.latitude, location.longitude]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#176fbb',
              fillOpacity: 1,
            }}
          >
            <Tooltip
              className="user-location-tooltip"
              direction="top"
              offset={[0, -8]}
              permanent
            >
              Sua localização atual
            </Tooltip>
          </CircleMarker>
        )}
        {points.map((point) => (
          <EcoPointMarker
            key={point.id}
            point={point}
            isSelected={selectedPointId === point.id}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>
      {locationStatus !== 'success' && (
        <div
          className={`map-location-status${locationStatus === 'error' ? ' map-location-status--error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {locationStatus === 'loading' ? (
            <>
              <span className="loading-dot" aria-hidden="true" />
              Obtendo sua localização atual…
            </>
          ) : locationErrorMessage}
        </div>
      )}
    </>
  );
}
