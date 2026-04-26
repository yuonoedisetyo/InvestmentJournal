import { useEffect, useState } from 'react';
import { getLatestArticles } from '../../data/articles';
import { portfolioApi } from '../../services/api';
import ArticleCards from './components/ArticleCards';
import DcfCalculator from './components/DcfCalculator';
import PublicPortfolioCards from './components/PublicPortfolioCards';

export default function LandingPage({ sessionUser }) {
  const [portfolios, setPortfolios] = useState([]);

  useEffect(() => {
    let active = true;

    portfolioApi
      .listPublicPortfolios()
      .then((data) => {
        if (active) {
          setPortfolios(Array.isArray(data) ? data.slice(0, 6) : []);
        }
      })
      .catch(() => {
        if (active) {
          setPortfolios([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="public-hero panel">
        <div>
          <p className="eyebrow">Jurnal investasi yang tenang dan jelas</p>
          <h1>Catat portfolio, uji valuasi DCF, lalu bagikan insight tanpa membuka dashboard privat.</h1>
          <p className="subtitle">
            Investment Journal membantu investor ritel menjaga keputusan tetap terdokumentasi, terukur, dan mudah
            ditinjau ulang.
          </p>
          <div className="public-hero-actions">
            <a className="primary-link" href="/calculator/dcf">
              Coba Kalkulator DCF
            </a>
            <a className="secondary-link" href={sessionUser ? '/app' : '/login'}>
              {sessionUser ? 'Buka Dashboard' : 'Masuk ke Dashboard'}
            </a>
          </div>
        </div>
        <div className="public-hero-side">
          <div className="hero-note">
            <strong>3 fungsi utama</strong>
            <p>Catat transaksi, cek valuasi, dan tampilkan portfolio public yang memang ingin dibagikan.</p>
          </div>
        </div>
      </section>

      <section className="public-strip">
        <div className="public-stat">
          <span>Catat investasi</span>
          <strong>Jurnal yang rapi</strong>
        </div>
        <div className="public-stat">
          <span>Pelajari valuasi</span>
          <strong>DCF yang praktis</strong>
        </div>
        <div className="public-stat">
          <span>Lihat ide orang lain</span>
          <strong>Portfolio public</strong>
        </div>
      </section>

      <section className="panel public-section">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Preview Kalkulator</p>
            <h2>Kalkulator DCF untuk membangun ekspektasi yang lebih disiplin.</h2>
          </div>
          <a className="text-link" href="/calculator/dcf">
            Buka halaman penuh
          </a>
        </div>
        <DcfCalculator compact />
      </section>

      <section className="panel public-section">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Portfolio Public</p>
            <h2>Lihat portfolio yang sengaja dibagikan oleh pemiliknya.</h2>
          </div>
          <a className="text-link" href="/public-portfolios">
            Lihat semua
          </a>
        </div>
        <PublicPortfolioCards portfolios={portfolios.slice(0, 6)} />
      </section>

      <section className="panel public-section">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Artikel Terbaru</p>
            <h2>Bahan baca singkat untuk membantu analisis tetap membumi.</h2>
          </div>
          <a className="text-link" href="/articles">
            Semua artikel
          </a>
        </div>
        <ArticleCards articles={getLatestArticles(3)} />
      </section>

      <section className="panel public-section" id="about">
        <p className="eyebrow">Tentang Kami</p>
        <h2>Produk ini dibuat untuk investor yang ingin berpikir lebih tertib, bukan lebih berisik.</h2>
        <p>
          Kami ingin memberi tempat sederhana untuk mencatat keputusan, melihat performa, dan menguji asumsi valuasi.
          Semua alat di sini dirancang untuk membantu analisis, bukan memberikan financial advice.
        </p>
      </section>

      <section className="panel public-cta">
        <h2>{sessionUser ? 'Lanjutkan review portfolio Anda di dashboard.' : 'Mulai dari login, lalu bangun jurnal investasi Anda.'}</h2>
        <a className="primary-link" href={sessionUser ? '/app' : '/login'}>
          {sessionUser ? 'Buka Dashboard' : 'Mulai Login'}
        </a>
      </section>
    </>
  );
}
