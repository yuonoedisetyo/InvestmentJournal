export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div>
        <p className="eyebrow">Investment Journal</p>
        <h3>Tempat sederhana untuk mencatat keputusan investasi dengan konteks yang lebih rapi.</h3>
      </div>
      <div className="public-footer-links">
        <a href="/articles">Artikel</a>
        <a href="/calculator/dcf">Kalkulator DCF</a>
        <a href="/public-portfolios">Portfolio Public</a>
        <a href="/login">Login</a>
      </div>
    </footer>
  );
}
