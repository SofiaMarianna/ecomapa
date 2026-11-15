import { useCallback, useEffect, useRef, useState } from 'react';
import DeleteEcoPointDialog from './components/DeleteEcoPointDialog.jsx';
import EcoPointForm from './components/EcoPointForm.jsx';
import EcoPointDetails from './components/EcoPointDetails.jsx';
import Header from './components/Header.jsx';
import PointsSidebar from './components/PointsSidebar.jsx';
import useEcoPointDetails from './hooks/useEcoPointDetails.js';
import useEcoPoints from './hooks/useEcoPoints.js';
import EcoMap from './map/EcoMap.jsx';
import { deleteEcoPoint } from './services/api.js';

export default function App() {
  const [bounds, setBounds] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [focusPoint, setFocusPoint] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [pointToDelete, setPointToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const boundsKeyRef = useRef(null);
  const pendingFocusRefreshRef = useRef(false);
  const isDeletingRef = useRef(false);
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

  const handleOpenForm = useCallback((mode) => {
    setSuccessMessage('');
    setFormMode(mode);
  }, []);

  const handleEditPoint = useCallback((point) => {
    setSuccessMessage('');
    setSelectedPoint(point);
    setFormMode('edit');
  }, []);

  const handleRequestDelete = useCallback((point) => {
    setSuccessMessage('');
    setDeleteError(null);
    setPointToDelete(point);
  }, []);

  const handleCancelDelete = useCallback(() => {
    if (isDeletingRef.current) {
      return;
    }

    setPointToDelete(null);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pointToDelete || isDeletingRef.current) {
      return;
    }

    isDeletingRef.current = true;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteEcoPoint(pointToDelete.id);
      const deletedPointId = pointToDelete.id;

      setPointToDelete(null);
      setSelectedPoint((current) => (
        current?.id === deletedPointId ? null : current
      ));
      setFocusPoint((current) => (
        current?.id === deletedPointId ? null : current
      ));
      pendingFocusRefreshRef.current = false;
      retryPointsRef.current();
      setSuccessMessage('Ponto excluído com sucesso.');
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      isDeletingRef.current = false;
      setIsDeleting(false);
    }
  }, [pointToDelete]);

  const handlePointSaved = useCallback((savedPoint, mode) => {
    pendingFocusRefreshRef.current = true;
    setSelectedPoint(savedPoint);
    setFocusPoint(savedPoint);
    setFormMode(null);
    setSuccessMessage(
      mode === 'edit'
        ? 'Ponto atualizado com sucesso.'
        : 'Ponto cadastrado com sucesso.',
    );
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setSuccessMessage(''), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  return (
    <div className="app-shell">
      <Header onOpenCreate={() => handleOpenForm('create')} />
      {successMessage && (
        <p className="app-success-message" role="status">{successMessage}</p>
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
            onEdit={handleEditPoint}
            onDelete={handleRequestDelete}
          />
        </main>
      </div>
      {formMode && (
        <EcoPointForm
          key={`${formMode}-${formMode === 'edit' ? details?.id : 'new'}`}
          mode={formMode}
          initialPoint={formMode === 'edit' ? details : null}
          onCancel={() => setFormMode(null)}
          onSaved={handlePointSaved}
        />
      )}
      {pointToDelete && (
        <DeleteEcoPointDialog
          point={pointToDelete}
          isDeleting={isDeleting}
          error={deleteError}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
