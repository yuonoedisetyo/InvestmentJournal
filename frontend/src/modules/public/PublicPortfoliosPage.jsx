import { useEffect, useState } from 'react';
import { portfolioApi } from '../../services/api';
import PublicPortfolioCards from './components/PublicPortfolioCards';

export default function PublicPortfoliosPage() {
  const [portfolios, setPortfolios] = useState([]);

  useEffect(() => {
    let active = true;

    portfolioApi
      .listPublicPortfolios()
      .then((data) => {
        if (active) {
          setPortfolios(Array.isArray(data) ? data : []);
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
    <section className="panel public-section">
      <p className="eyebrow">Portfolio Public</p>
      <h1>Daftar portfolio yang sudah di-set public oleh pemiliknya.</h1>
      <p className="subtitle">Setiap card mengarah ke tampilan read-only yang tetap memakai share token seperti flow yang sudah ada.</p>
      <PublicPortfolioCards portfolios={portfolios} />
    </section>
  );
}
