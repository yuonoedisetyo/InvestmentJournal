import { articles } from '../../data/articles';
import ArticleCards from './components/ArticleCards';

export default function ArticlesPage() {
  return (
    <section className="panel public-section">
      <p className="eyebrow">Artikel</p>
      <h1>Artikel edukasi investasi untuk menemani proses analisis.</h1>
      <p className="subtitle">Konten fase awal masih statis, ringkas, dan difokuskan pada topik yang relevan dengan valuasi serta disiplin mencatat investasi.</p>
      <ArticleCards articles={articles} />
    </section>
  );
}
