export default function Header({ userName, onLogout }) {
  return (
    <header className="app-header">
      <div className="header-row">
        <div>
          <p className="eyebrow">Investment Journal</p>
          <h1>Portfolio Tracker Saham</h1>
          <p className="subtitle">Catat transaksi, pantau nilai investasi, dan bandingkan performa dengan IHSG.</p>
        </div>

        {onLogout ? (
          <div className="header-actions">
            {userName ? <p className="header-user">Halo, {userName}</p> : null}
            <button type="button" className="header-logout-btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
