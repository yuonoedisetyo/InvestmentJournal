function resolveHref(path) {
  return path;
}

export default function PublicNav({ sessionUser }) {
  return (
    <header className="public-nav">
      <a className="public-brand" href="/">
        <span className="public-brand-mark">IJ</span>
        <span>
          <strong>Investment Journal</strong>
          <small>Catat, analisis, dan bagikan portfolio.</small>
        </span>
      </a>

      <nav className="public-nav-links" aria-label="Navigasi publik">
        <a href={resolveHref('/articles')}>Artikel</a>
        <a href={resolveHref('/calculator/dcf')}>Kalkulator DCF</a>
        <a href={resolveHref('/public-portfolios')}>Portfolio Public</a>
        <a href={resolveHref('/#about')}>Tentang Kami</a>
      </nav>

      <a className="public-nav-cta" href={sessionUser ? '/app' : '/login'}>
        {sessionUser ? 'Buka Dashboard' : 'Login'}
      </a>
    </header>
  );
}
