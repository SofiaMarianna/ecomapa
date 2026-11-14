function DemoBadge() {
  return <span className="demo-badge">Demonstração</span>;
}

export default function PointsSidebar({
  points,
  selectedPointId,
  isLoading,
  error,
  onRetry,
  onSelect,
}) {
  return (
    <aside className="points-sidebar" aria-labelledby="points-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Na região visível</p>
          <h1 id="points-heading">Pontos de coleta</h1>
        </div>
        {!isLoading && !error && (
          <span className="point-count" aria-label={`${points.length} pontos`}>
            {points.length}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="state-message" role="status">
          <span className="loading-dot" aria-hidden="true" />
          Carregando pontos desta região…
        </p>
      )}

      {error && (
        <div className="state-message state-message--error" role="alert">
          <p>Não foi possível carregar os pontos. {error}</p>
          <button className="text-button" type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && points.length === 0 && (
        <p className="state-message">
          Nenhum ponto encontrado nesta região. Mova ou aproxime o mapa para
          consultar outra área.
        </p>
      )}

      {points.length > 0 && (
        <>
          <ul className="point-list" aria-label="Pontos de coleta encontrados">
            {points.map((point) => (
              <li key={point.id}>
                <button
                  className={`point-card${selectedPointId === point.id ? ' point-card--selected' : ''}`}
                  type="button"
                  aria-pressed={selectedPointId === point.id}
                  onClick={() => onSelect(point)}
                >
                  <span className="point-card-title">{point.name}</span>
                  {point.address && (
                    <span className="point-card-address">{point.address}</span>
                  )}
                  {point.is_demo && <DemoBadge />}
                </button>
              </li>
            ))}
          </ul>
          <p className="demo-note">
            Pontos marcados como demonstração são dados ilustrativos, não locais
            confirmados de coleta.
          </p>
        </>
      )}
    </aside>
  );
}
