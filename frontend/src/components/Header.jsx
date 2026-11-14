export default function Header() {
  return (
    <header className="app-header">
      <a className="brand" href="/" aria-label="EcoMapa, início">
        <span className="brand-mark" aria-hidden="true">
          E
        </span>
        <span>
          <strong>EcoMapa</strong>
          <span className="brand-subtitle">Cajazeiras, Paraíba</span>
        </span>
      </a>
      <p className="header-note">Pontos de coleta seletiva perto de você</p>
    </header>
  );
}
