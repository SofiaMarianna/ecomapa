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

function FocusPointController({ point, onBoundsChange, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !point) {
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
  }, [enabled, map, onBoundsChange, point]);
}

function NearbyResultsController({
  enabled,
  location,
  points,
  isLoading,
  interactionVersionRef,
}) {
  const map = useMap();
  const wasEnabledRef = useRef(false);
  const wasLoadingRef = useRef(false);
  const interactionVersionAtEnableRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      wasEnabledRef.current = false;
      wasLoadingRef.current = false;
      interactionVersionAtEnableRef.current = null;
      return;
    }

    const justEnabled = !wasEnabledRef.current;
    if (justEnabled) {
      wasEnabledRef.current = true;
      interactionVersionAtEnableRef.current = interactionVersionRef.current;
      if (location) {
        map.setView(
          [location.latitude, location.longitude],
          Math.max(map.getZoom(), 14),
        );
      }
    }

    if (isLoading) {
      wasLoadingRef.current = true;
      return;
    }

    if (!wasLoadingRef.current || !location) {
      return;
    }

    wasLoadingRef.current = false;
    if (
      interactionVersionAtEnableRef.current !== interactionVersionRef.current
    ) {
      return;
    }

    const locationPosition = [location.latitude, location.longitude];
    const pointPositions = points
      .filter((point) => (
        Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      ))
      .map((point) => [point.latitude, point.longitude]);

    if (pointPositions.length === 0) {
      return;
    }

    map.fitBounds([locationPosition, ...pointPositions], {
      padding: [36, 36],
      maxZoom: 15,
    });
  }, [enabled, interactionVersionRef, isLoading, location, map, points]);

  return null;
}

function MapInteractionTracker({ onUserInteraction, interactionVersionRef }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const handleInteraction = () => {
      interactionVersionRef.current += 1;
      onUserInteraction();
    };

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
  }, [interactionVersionRef, map, onUserInteraction]);

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
  isProximityMode,
  isPointsLoading,
}) {
  const interactionVersionRef = useRef(0);

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
        <MapInteractionTracker
          onUserInteraction={onUserInteraction}
          interactionVersionRef={interactionVersionRef}
        />
        <NearbyResultsController
          enabled={isProximityMode}
          location={location}
          points={points}
          isLoading={isPointsLoading}
          interactionVersionRef={interactionVersionRef}
        />
        <LocationController
          location={location}
          hasUserInteractedRef={hasUserInteractedRef}
        />
        <FocusPointController
          point={focusPoint}
          onBoundsChange={onBoundsChange}
          enabled={!isProximityMode}
        />
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
