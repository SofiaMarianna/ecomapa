import { useCallback, useState } from 'react';
import EcoPointDetails from './components/EcoPointDetails.jsx';
import Header from './components/Header.jsx';
import PointsSidebar from './components/PointsSidebar.jsx';
import useEcoPointDetails from './hooks/useEcoPointDetails.js';
import useEcoPoints from './hooks/useEcoPoints.js';
import EcoMap from './map/EcoMap.jsx';

export default function App() {
  const [bounds, setBounds] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const { points, isLoading, error, retry } = useEcoPoints(bounds);
  const {
    details,
    isLoading: isDetailsLoading,
    error: detailsError,
    retry: retryDetails,
  } = useEcoPointDetails(selectedPoint?.id);

  const handleBoundsChange = useCallback((nextBounds) => {
    setBounds(nextBounds);
  }, []);

  const handleSelectPoint = useCallback((point) => {
    setSelectedPoint(point);
  }, []);

  return (
    <div className="app-shell">
      <Header />
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
    </div>
  );
}
