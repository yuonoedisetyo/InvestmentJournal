import { useEffect, useState } from 'react';
import Header from './components/Header';
import PerformanceChart from './modules/dashboard/PerformanceChart';
import SummaryCards from './modules/dashboard/SummaryCards';
import PortfolioSelector from './modules/portfolio/PortfolioSelector';
import PositionsTable from './modules/portfolio/PositionsTable';
import JournalTable from './modules/transactions/JournalTable';
import TransactionForm from './modules/transactions/TransactionForm';
import { portfolioApi, priceApi, transactionApi } from './services/api';
import { useInvestmentStore } from './store/useInvestmentStore';

function App() {
  const {
    portfolios,
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
  } = useInvestmentStore();

  const [notice, setNotice] = useState('');
  const [journalData, setJournalData] = useState([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [capitalSummary, setCapitalSummary] = useState(null);
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState(false);

  async function loadPositions(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      setPositions([]);
      return;
    }

    try {
      const data = await portfolioApi.listPositions(portfolioId);
      const normalized = Array.isArray(data)
        ? data.map((item) => ({
            stock_code: item.stock_code,
            total_shares: Number(item.total_shares ?? 0),
            average_price: Number(item.average_price ?? 0),
            last_price: Number(item.last_price ?? 0),
            invested_amount: Number(item.invested_amount ?? 0),
            market_value: Number(item.market_value ?? 0),
            unrealized_pnl: Number(item.unrealized_pnl ?? 0),
            realized_pnl: Number(item.realized_pnl ?? 0),
          }))
        : [];
      setPositions(normalized);
    } catch {
      setPositions([]);
    }
  }

  async function loadJournal(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      setJournalData([]);
      return;
    }

    try {
      const data = await transactionApi.listJournal(portfolioId);
      const normalized = Array.isArray(data)
        ? data.map((item) => ({
            id: item.id,
            entry_type: item.entry_type || 'STOCK',
            row_key: `${item.entry_type || 'STOCK'}-${item.id}`,
            transaction_date: String(item.transaction_date).slice(0, 10),
            type: item.type,
            stock_code: item.stock_code,
            lot: item.lot == null ? null : Number(item.lot),
            price: item.price == null ? null : Number(item.price),
            amount: Number(item.amount ?? item.net_amount ?? 0),
            fee: Number(item.fee ?? 0),
            notes: item.notes,
          }))
        : [];
      setJournalData(normalized);
    } catch {
      setJournalData([]);
    }
  }

  async function loadCashBalance(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      setCashBalance(0);
      return;
    }

    try {
      const data = await portfolioApi.cashBalance(portfolioId);
      setCashBalance(Number(data?.cash_balance ?? 0));
    } catch {
      setCashBalance(0);
    }
  }

  async function loadCapitalSummary(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      setCapitalSummary(null);
      return;
    }

    try {
      const data = await portfolioApi.capitalSummary(portfolioId);
      setCapitalSummary(data);
      if (data?.cash_balance != null) {
        setCashBalance(Number(data.cash_balance));
      }
    } catch {
      setCapitalSummary(null);
    }
  }

  async function loadPerformanceData(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      setPerformanceData([]);
      return;
    }

    try {
      const data = await portfolioApi.performance(portfolioId);
      setPerformanceData(Array.isArray(data) ? data : []);
    } catch {
      setPerformanceData([]);
    }
  }

  useEffect(() => {
    loadPositions(selectedPortfolioId);
    loadJournal(selectedPortfolioId);
    loadCashBalance(selectedPortfolioId);
    loadCapitalSummary(selectedPortfolioId);
    loadPerformanceData(selectedPortfolioId);
  }, [selectedPortfolioId]);

  async function handleCreatePortfolio(payload) {
    try {
      const created = await createPortfolio(payload);
      setNotice(`Portfolio ${created.name} berhasil dibuat.`);
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal membuat portfolio.';
      setNotice(message);
    } finally {
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleChangePortfolio(id) {
    try {
      await setActivePortfolio(id);
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal mengubah portfolio aktif.';
      setNotice(message);
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleSubmitTransaction(entry) {
    try {
      if (entry.type === 'BUY') {
        await transactionApi.buy({
          portfolio_id: entry.portfolio_id,
          stock_code: entry.stock_code,
          lot: entry.lot,
          price: entry.price,
          fee: entry.fee,
          transaction_date: entry.transaction_date,
          notes: entry.notes,
        });
      } else if (entry.type === 'SELL') {
        await transactionApi.sell({
          portfolio_id: entry.portfolio_id,
          stock_code: entry.stock_code,
          lot: entry.lot,
          price: entry.price,
          fee: entry.fee,
          transaction_date: entry.transaction_date,
          notes: entry.notes,
        });
      } else if (entry.type === 'DIVIDEND') {
        await transactionApi.addDividend({
          portfolio_id: entry.portfolio_id,
          stock_code: entry.stock_code,
          amount: entry.amount,
          pay_date: entry.transaction_date,
          notes: entry.notes,
        });
      } else if (entry.type === 'TOPUP') {
        await transactionApi.topup({
          portfolio_id: entry.portfolio_id,
          amount: entry.amount,
          transaction_date: entry.transaction_date,
          notes: entry.notes,
        });
      } else if (entry.type === 'WITHDRAW') {
        await transactionApi.withdraw({
          portfolio_id: entry.portfolio_id,
          amount: entry.amount,
          transaction_date: entry.transaction_date,
          notes: entry.notes,
        });
      }

      await Promise.all([
        loadPositions(entry.portfolio_id),
        loadJournal(entry.portfolio_id),
        loadCashBalance(entry.portfolio_id),
        loadCapitalSummary(entry.portfolio_id),
        loadPerformanceData(entry.portfolio_id),
      ]);
      setNotice(`Transaksi ${entry.type} untuk portfolio ${selectedPortfolio?.name || '-'} berhasil dicatat.`);
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal menyimpan transaksi ke API.';
      setNotice(message);
    } finally {
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleEditJournal(entry, payload) {
    try {
      if (entry.entry_type === 'CASH') {
        await transactionApi.updateCashMutation(entry.id, {
          amount: payload.amount,
          transaction_date: payload.transaction_date,
          notes: payload.notes,
        });
      } else if (entry.entry_type === 'DIVIDEND') {
        await transactionApi.updateDividend(entry.id, {
          amount: payload.amount,
          pay_date: payload.transaction_date,
          notes: payload.notes,
        });
      } else {
        await transactionApi.updateJournal(entry.id, {
          transaction_date: payload.transaction_date,
          lot: payload.lot,
          price: payload.price,
          fee: payload.fee,
          notes: payload.notes,
        });
      }
      await Promise.all([
        loadPositions(selectedPortfolioId),
        loadJournal(selectedPortfolioId),
        loadCashBalance(selectedPortfolioId),
        loadCapitalSummary(selectedPortfolioId),
        loadPerformanceData(selectedPortfolioId),
      ]);
      setNotice('Jurnal transaksi berhasil diperbarui.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal mengubah jurnal transaksi.';
      setNotice(message);
    } finally {
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleDeleteJournal(entry) {
    try {
      if (entry.entry_type === 'CASH') {
        await transactionApi.deleteCashMutation(entry.id);
      } else if (entry.entry_type === 'DIVIDEND') {
        await transactionApi.deleteDividend(entry.id);
      } else {
        await transactionApi.deleteJournal(entry.id);
      }
      await Promise.all([
        loadPositions(selectedPortfolioId),
        loadJournal(selectedPortfolioId),
        loadCashBalance(selectedPortfolioId),
        loadCapitalSummary(selectedPortfolioId),
        loadPerformanceData(selectedPortfolioId),
      ]);
      setNotice('Jurnal transaksi berhasil dihapus.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal menghapus jurnal transaksi.';
      setNotice(message);
    } finally {
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleUpdateLastPrice(stockCode, price) {
    try {
      await priceApi.manualUpdate({
        stock_code: stockCode,
        price,
        source: 'MANUAL_FRONTEND',
      });
      await loadPositions(selectedPortfolioId);
      await loadPerformanceData(selectedPortfolioId);
      setNotice(`Last price ${stockCode} berhasil diperbarui.`);
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal memperbarui last price.';
      setNotice(message);
    } finally {
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleSyncSpreadsheet() {
    if (!selectedPortfolioId || isSyncingSpreadsheet) {
      return;
    }

    try {
      setIsSyncingSpreadsheet(true);
      await priceApi.readSpreadsheet({
        upsert: true,
        source: 'SPREADSHEET',
      });
      await Promise.all([
        loadPositions(selectedPortfolioId),
        loadCashBalance(selectedPortfolioId),
        loadCapitalSummary(selectedPortfolioId),
        loadPerformanceData(selectedPortfolioId),
      ]);
      setNotice('Sync harga dari spreadsheet berhasil.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal sync harga dari spreadsheet.';
      setNotice(message);
    } finally {
      setIsSyncingSpreadsheet(false);
      setTimeout(() => setNotice(''), 2400);
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <main className="app-main">
        <Header />

        {notice ? <div className="notice">{notice}</div> : null}

        <PortfolioSelector
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          onChange={handleChangePortfolio}
          onCreate={handleCreatePortfolio}
          creating={isCreatingPortfolio}
        />

        <section className="two-col">
          <TransactionForm portfolioId={selectedPortfolioId} onSubmit={handleSubmitTransaction} />
          <PerformanceChart data={performanceData} />
        </section>
        <SummaryCards summary={summary} cashBalance={cashBalance} capitalSummary={capitalSummary} />


        <PositionsTable
          summary={summary}
          positions={positions}
          onUpdateLastPrice={handleUpdateLastPrice}
          onSyncSpreadsheet={handleSyncSpreadsheet}
          syncing={isSyncingSpreadsheet}
        />
        <JournalTable data={journalData} onEdit={handleEditJournal} onDelete={handleDeleteJournal} />
      </main>
    </div>
  );
}

export default App;
