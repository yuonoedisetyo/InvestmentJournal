export default function PortfolioSelector({
  portfolios,
  selectedPortfolioId,
  onChange,
  onOpenCreateForm,
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
    </section>
  );
}
