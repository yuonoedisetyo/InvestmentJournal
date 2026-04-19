import { useEffect, useMemo, useState } from 'react';
import { portfolioApi } from '../services/api';

const defaultPortfolios = [
  // {
  //   id: 1,
  //   name: 'Yuono Portfolio',
  //   currency: 'IDR',
  //   is_active: true,
  // },
  // {
  //   id: 2,
  //   name: 'Axel Portfolio',
  //   currency: 'IDR',
  //   is_active: false,
  // },
];

const defaultPositions = [
  // {
  //   stock_code: 'BBCA',
  //   total_shares: 1000,
  //   average_price: 9050,
  //   last_price: 9325,
  //   market_value: 9325000,
  //   invested_amount: 9050000,
  //   unrealized_pnl: 275000,
  //   realized_pnl: 120000,
  // },
  // {
  //   stock_code: 'TLKM',
  //   total_shares: 1500,
  //   average_price: 3925,
  //   last_price: 4010,
  //   market_value: 6015000,
  //   invested_amount: 5887500,
  //   unrealized_pnl: 127500,
  //   realized_pnl: 80000,
  // },
];

const defaultPerformance = {
  meta: {
    benchmark: 'IHSG',
    method: 'time_weighted_return',
    base_index: 100,
  },
  summary: null,
  series: [
    { date: '2026-02-20', portfolio_index: 100, benchmark_index: 100 },
    { date: '2026-02-21', portfolio_index: 100.5, benchmark_index: 100.2 },
    { date: '2026-02-22', portfolio_index: 101.2, benchmark_index: 100.6 },
    { date: '2026-02-23', portfolio_index: 101.0, benchmark_index: 100.4 },
    { date: '2026-02-24', portfolio_index: 102.4, benchmark_index: 101.0 },
    { date: '2026-02-25', portfolio_index: 102.1, benchmark_index: 100.8 },
    { date: '2026-02-26', portfolio_index: 103.3, benchmark_index: 101.4 },
    { date: '2026-02-27', portfolio_index: 104.0, benchmark_index: 101.8 },
    { date: '2026-02-28', portfolio_index: 104.6, benchmark_index: 102.1 },
  ],
};

export function useInvestmentStore() {
  const [portfolios, setPortfolios] = useState(defaultPortfolios);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(defaultPortfolios[0]?.id ?? null);
  const [positions, setPositions] = useState(defaultPositions);
  const [performanceData, setPerformanceData] = useState(defaultPerformance);
  const [journal, setJournal] = useState([]);
  const [isCreatingPortfolio, setIsCreatingPortfolio] = useState(false);

  const selectedPortfolio = useMemo(
    () => portfolios.find((item) => item.id === selectedPortfolioId) || portfolios[0],
    [portfolios, selectedPortfolioId]
  );

  useEffect(() => {
    let mounted = true;

    async function loadPortfolios() {
      try {
        const data = await portfolioApi.listPortfolios();
        if (!mounted || !Array.isArray(data) || data.length === 0) {
          return;
        }

        setPortfolios(data);
        const active = data.find((item) => item.is_active);
        setSelectedPortfolioId(active?.id ?? data[0].id);
      } catch {
        // Keep local fallback data when API is unavailable.
      }
    }

    loadPortfolios();

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const invested = positions.reduce((acc, item) => acc + Number(item.invested_amount), 0);
    const marketValue = positions.reduce((acc, item) => acc + Number(item.market_value), 0);
    const unrealized = positions.reduce((acc, item) => acc + Number(item.unrealized_pnl), 0);
    const realized = positions.reduce((acc, item) => acc + Number(item.realized_pnl), 0);
    const pnlPercent = invested ? ((marketValue - invested) / invested) * 100 : 0;

    return {
      invested,
      marketValue,
      unrealized,
      realized,
      pnlPercent,
      totalPnl: unrealized + realized,
    };
  }, [positions]);

  function addJournalEntry(entry) {
    setJournal((current) => [
      {
        ...entry,
        id: Date.now(),
      },
      ...current,
    ]);
  }

  async function setActivePortfolio(id) {
    await portfolioApi.activatePortfolio(id);
    setSelectedPortfolioId(id);
    setPortfolios((current) =>
      current.map((portfolio) => ({
        ...portfolio,
        is_active: portfolio.id === id,
      }))
    );
  }

  async function createPortfolio(payload) {
    setIsCreatingPortfolio(true);
    try {
      const created = await portfolioApi.createPortfolio(payload);
      setPortfolios((current) => {
        if (created?.is_active) {
          return current
            .map((item) => ({ ...item, is_active: false }))
            .concat(created);
        }
        return current.concat(created);
      });
      if (created?.is_active) {
        setSelectedPortfolioId(created.id);
      }
      return created;
    } finally {
      setIsCreatingPortfolio(false);
    }
  }

  return {
    portfolios,
    setPortfolios,
    selectedPortfolio,
    selectedPortfolioId,
    setActivePortfolio,
    createPortfolio,
    isCreatingPortfolio,
    positions,
    setPositions,
    summary,
    performanceData,
    setPerformanceData,
    journal,
    addJournalEntry,
  };
}
