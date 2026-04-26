function formatArticleDate(value) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ArticleCards({ articles }) {
  return (
    <div className="public-card-grid">
      {articles.map((article) => (
        <article key={article.slug} className={`public-card article-card accent-${article.coverAccent}`}>
          <p className="card-kicker">
            {article.category} · {article.readingTime}
          </p>
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
          <div className="card-meta">
            <span>{formatArticleDate(article.publishedAt)}</span>
            <a href={`/articles/${article.slug}`}>Baca Artikel</a>
          </div>
        </article>
      ))}
    </div>
  );
}
