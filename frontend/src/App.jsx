import { useCallback, useEffect, useRef, useState } from 'react';
import CreateEcoPointForm from './components/CreateEcoPointForm.jsx';
import EcoPointDetails from './components/EcoPointDetails.jsx';
import Header from './components/Header.jsx';
import PointsSidebar from './components/PointsSidebar.jsx';
import useEcoPointDetails from './hooks/useEcoPointDetails.js';
import useEcoPoints from './hooks/useEcoPoints.js';
import EcoMap from './map/EcoMap.jsx';

export default function App() {
  const [bounds, setBounds] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [creationStatus, setCreationStatus] = useState('');
  const boundsKeyRef = useRef(null);
  const pendingFocusRefreshRef = useRef(false);
  const { points, isLoading, error, retry } = useEcoPoints(bounds);
  const retryPointsRef = useRef(retry);
  retryPointsRef.current = retry;
  const {
    details,
    isLoading: isDetailsLoading,
    error: detailsError,
    retry: retryDetails,
  } = useEcoPointDetails(selectedPoint?.id, selectedPoint);

  const handleBoundsChange = useCallback((nextBounds) => {
    const nextKey = `${nextBounds.west},${nextBounds.south},${nextBounds.east},${nextBounds.north}`;
    const previousKey = boundsKeyRef.current;
    boundsKeyRef.current = nextKey;
    setBounds(nextBounds);

    if (pendingFocusRefreshRef.current) {
      pendingFocusRefreshRef.current = false;
      if (previousKey === nextKey) {
        retryPointsRef.current();
      }
    }
  }, []);

  const handleSelectPoint = useCallback((point) => {
    setSelectedPoint(point);
  }, []);

  const handleOpenCreateForm = useCallback(() => {
    setCreationStatus('');
    setIsCreateFormOpen(true);
  }, []);

  const handleCloseCreateForm = useCallback(() => {
    setIsCreateFormOpen(false);
  }, []);

  const handlePointCreated = useCallback((createdPoint) => {
    pendingFocusRefreshRef.current = true;
    setSelectedPoint(createdPoint);
    setFocusPoint(createdPoint);
    setIsCreateFormOpen(false);
    setCreationStatus('Ponto cadastrado com sucesso.');
  }, []);

  useEffect(() => {
    if (!creationStatus) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCreationStatus(''), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [creationStatus]);

  return (
    <div className="app-shell">
      <Header onOpenCreate={handleOpenCreateForm} />
      {creationStatus && (
        <p className="app-success-message" role="status">{creationStatus}</p>
      )}
      <div className="workspace">
        <PointsSidebar
          points={points}
          selectedPointId={selectedPoint?.id}
          isLoading={isLoading}
          error={error}
          onRetry={retry}
          onSelect={handleSelectPoint}
        />
        <main className="map-workspace">
          <section className="map-panel" aria-label="Mapa de pontos de coleta">
            <EcoMap
              points={points}
              selectedPointId={selectedPoint?.id}
              onBoundsChange={handleBoundsChange}
              onSelect={handleSelectPoint}
              focusPoint={focusPoint}
            />
          </section>
          <EcoPointDetails
            point={details}
            selectedPoint={selectedPoint}
            isLoading={isDetailsLoading}
            error={detailsError}
            onRetry={retryDetails}
          />
        </main>
      </div>
      {isCreateFormOpen && (
        <CreateEcoPointForm
          onCancel={handleCloseCreateForm}
          onCreated={handlePointCreated}
        />
      )}
    </div>
  );
}
