function DemoBadge() {
  return <span className="demo-badge">Demonstração</span>;
}

export default function EcoPointDetails({
  point,
  selectedPoint,
  isLoading,
  error,
  onRetry,
  onEdit,
  onDelete,
}) {
  return (
    <section
      className="details-panel"
      aria-labelledby="details-heading"
      aria-live="polite"
      tabIndex="-1"
    >
      <p className="eyebrow">Informações do local</p>
      <h2 id="details-heading">Detalhes do ponto</h2>

      {!selectedPoint && (
        <p className="details-placeholder">
          Selecione um ponto no mapa ou na lista para ver os detalhes.
        </p>
      )}

      {selectedPoint && isLoading && (
        <p className="state-message" role="status">
          <span className="loading-dot" aria-hidden="true" />
          Carregando detalhes…
        </p>
      )}

      {selectedPoint && error && (
        <div className="state-message state-message--error" role="alert">
          <p>Não foi possível carregar os detalhes. {error}</p>
          <button className="text-button" type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}

      {selectedPoint &&
        point?.id === selectedPoint.id &&
        !isLoading &&
        !error && (
        <div className="point-details">
          <div className="details-title">
            <h3>{point.name}</h3>
            {point.is_demo && <DemoBadge />}
          </div>
          {Array.isArray(point.materials) && (onEdit || onDelete) && (
            <div className="details-action-buttons">
              {onEdit && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onEdit(point)}
                >
                  Editar ponto
                </button>
              )}
              {onDelete && (
                <button
                  className="destructive-button"
                  type="button"
                  onClick={() => onDelete(point)}
                >
                  Excluir ponto
                </button>
              )}
            </div>
          )}
          {point.address && (
            <p className="details-address">{point.address}</p>
          )}
          {point.description && (
            <div className="detail-block">
              <h4>Sobre o ponto</h4>
              <p>{point.description}</p>
            </div>
          )}
          <div className="detail-block">
            <h4>Materiais aceitos</h4>
            {point.materials?.length > 0 ? (
              <ul className="material-list">
                {point.materials.map((material) => (
                  <li key={material.id}>
                    <strong>{material.name}</strong>
                    {material.description && <p>{material.description}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Não há materiais cadastrados para este ponto.</p>
            )}
          </div>
          {point.is_demo && (
            <p className="demo-disclaimer">
              Este é um registro de demonstração e não representa um local
              confirmado de coleta.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
