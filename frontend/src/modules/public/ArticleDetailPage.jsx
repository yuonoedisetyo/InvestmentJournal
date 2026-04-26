import { getArticleBySlug } from '../../data/articles';

function renderBlock(block) {
  if (block.type === 'heading') {
    return <h2 key={block.text}>{block.text}</h2>;
  }

  if (block.type === 'bullet_list') {
    return (
      <ul key={block.items.join('-')}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p key={block.text}>{block.text}</p>;
}

export default function ArticleDetailPage({ slug }) {
  const article = getArticleBySlug(slug);

  if (!article) {
    return (
      <section className="panel public-section">
        <p className="eyebrow">Artikel tidak ditemukan</p>
        <h1>Slug artikel ini belum tersedia.</h1>
        <a className="text-link" href="/articles">
          Kembali ke daftar artikel
        </a>
      </section>
    );
  }

  return (
    <article className="panel article-detail">
      <p className="eyebrow">
        {article.category} · {article.readingTime}
      </p>
      <h1>{article.title}</h1>
      <p className="subtitle">{article.excerpt}</p>
      <div className="article-content">{article.content.map(renderBlock)}</div>
    </article>
  );
}
