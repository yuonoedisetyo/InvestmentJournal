export default function StatCard({ label, value, accent, hint }) {
  return (
    <article className="stat-card" style={{ '--accent': accent }}>
      <p className="stat-label">{label}</p>
      <h3 className="stat-value">{value}</h3>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}
