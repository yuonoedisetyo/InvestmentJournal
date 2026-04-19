export default function PortfolioSelector({
  portfolios,
  selectedPortfolioId,
  selectedPortfolio,
  onChange,
  onOpenCreateForm,
  onSharingChange,
  onCopyShareLink,
  updatingSharing = false,
  showCreateButton = true,
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Portfolio Aktif</h2>
        {showCreateButton ? (
          <div className="panel-head-actions">
            <button type="button" className="table-btn" onClick={onOpenCreateForm}>
              Add Portfolio
            </button>
          </div>
        ) : null}
      </div>
      <div className="portfolio-list">
        {portfolios.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`portfolio-chip ${item.id === selectedPortfolioId ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <span>{item.name}</span>
            {item.is_active ? <small>Active</small> : <small>Inactive</small>}
          </button>
        ))}
      </div>
      {selectedPortfolio ? (
        <div className="panel-head" style={{ marginTop: '1rem', alignItems: 'end' }}>
          <div>
            <h3 style={{ margin: 0 }}>{selectedPortfolio.name}</h3>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--muted-text, #64748b)' }}>
              Share portfolio ini sebagai tampilan read-only.
            </p>
          </div>
          <div className="panel-head-actions">
            <label>
              Share
              <select
                value={selectedPortfolio.is_public ? 'public' : 'private'}
                onChange={(event) => onSharingChange?.(selectedPortfolio.id, event.target.value === 'public')}
                disabled={updatingSharing}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>
            {selectedPortfolio.is_public ? (
              <button type="button" className="table-btn" onClick={() => onCopyShareLink?.(selectedPortfolio)}>
                Copy Link
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
