function formatUpdatedAt(value) {
  if (!value) {
    return 'Belum ada update';
  }

  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PublicPortfolioCards({ portfolios }) {
  if (!portfolios.length) {
    return <div className="public-empty-state">Belum ada portfolio public yang bisa ditampilkan.</div>;
  }

  return (
    <div className="public-card-grid">
      {portfolios.map((portfolio) => (
        <article key={portfolio.id} className="public-card portfolio-card">
          <p className="card-kicker">{portfolio.currency}</p>
          <h3>{portfolio.name}</h3>
          <p>Disusun oleh {portfolio.owner_name || 'Investor anonim'}.</p>
          <div className="card-meta">
            <span>Update {formatUpdatedAt(portfolio.updated_at)}</span>
            <a href={`/shared/portfolio/${portfolio.share_token}`}>Lihat Portfolio</a>
          </div>
        </article>
      ))}
    </div>
  );
}
