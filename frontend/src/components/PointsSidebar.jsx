function DemoBadge() {
  return <span className="demo-badge">Demonstração</span>;
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(distanceMeters / 1000)} km`;
}

export default function PointsSidebar({
  mode,
  onModeChange,
  locationStatus,
  locationErrorMessage,
  points,
  selectedPointId,
  isLoading,
  error,
  onRetry,
  onSelect,
}) {
  const proximityAvailable = locationStatus === 'success';
  const proximityHelp = proximityAvailable
    ? 'Busca pontos em um raio fixo de 2 km usando sua localização atual.'
    : locationStatus === 'loading'
      ? 'A busca por proximidade ficará disponível quando sua localização for obtida.'
      : locationErrorMessage
        ? `Busca por proximidade indisponível. ${locationErrorMessage}`
        : 'Busca por proximidade indisponível porque sua localização não foi obtida.';

  return (
    <aside className="points-sidebar" aria-labelledby="points-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {mode === 'nearby' ? 'Até 2 km de você' : 'Na região visível'}
          </p>
          <h1 id="points-heading">Pontos de coleta</h1>
        </div>
        {!isLoading && !error && (
          <span className="point-count" aria-label={`${points.length} pontos`}>
            {points.length}
          </span>
        )}
      </div>

      <fieldset className="points-mode-control">
        <legend className="points-mode-legend">Exibir pontos</legend>
        <label
          className={`points-mode-option${mode === 'visible' ? ' points-mode-option--selected' : ''}`}
        >
          <input
            type="radio"
            name="points-mode"
            value="visible"
            checked={mode === 'visible'}
            onChange={() => onModeChange('visible')}
          />
          <span>Na região visível</span>
        </label>
        <label
          className={`points-mode-option${mode === 'nearby' ? ' points-mode-option--selected' : ''}${proximityAvailable ? '' : ' points-mode-option--disabled'}`}
        >
          <input
            type="radio"
            name="points-mode"
            value="nearby"
            checked={mode === 'nearby'}
            disabled={!proximityAvailable}
            aria-describedby="proximity-mode-help"
            onChange={() => onModeChange('nearby')}
          />
          <span>
            <span className="points-mode-label">Até 2 km de você</span>
            <span className="points-mode-description">Raio fixo de 2 km</span>
          </span>
        </label>
        <p
          id="proximity-mode-help"
          className="points-mode-help"
          role="status"
          aria-live="polite"
        >
          {proximityHelp}
        </p>
      </fieldset>

      {isLoading && (
        <p className="state-message" role="status">
          <span className="loading-dot" aria-hidden="true" />
          {mode === 'nearby'
            ? 'Carregando pontos a até 2 km de sua localização…'
            : 'Carregando pontos desta região…'}
        </p>
      )}

      {error && (
        <div className="state-message state-message--error" role="alert">
          <p>
            {mode === 'nearby'
              ? 'Não foi possível carregar os pontos próximos.'
              : 'Não foi possível carregar os pontos.'}{' '}
            {error}
          </p>
          <button className="text-button" type="button" onClick={onRetry}>
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && points.length === 0 && (
        <p className="state-message">
          {mode === 'nearby'
            ? 'Nenhum ponto encontrado em até 2 km da sua localização.'
            : 'Nenhum ponto encontrado nesta região. Mova ou aproxime o mapa para consultar outra área.'}
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
                  {mode === 'nearby' && Number.isFinite(point.distance_meters) && (
                    <span className="point-card-distance">
                      {formatDistance(point.distance_meters)}
                    </span>
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
