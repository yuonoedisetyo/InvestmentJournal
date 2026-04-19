import { useEffect, useState } from 'react';
import Header from './components/Header';
import CapitalComparisonChart from './modules/dashboard/CapitalComparisonChart';
import PerformanceChart from './modules/dashboard/PerformanceChart';
import SummaryCards from './modules/dashboard/SummaryCards';
import PortfolioForm from './modules/portfolio/PortfolioForm';
import PortfolioSelector from './modules/portfolio/PortfolioSelector';
import PositionsTable from './modules/portfolio/PositionsTable';
import JournalTable from './modules/transactions/JournalTable';
import TransactionForm from './modules/transactions/TransactionForm';
import {
  authApi,
  clearAuthSession,
  portfolioApi,
  priceApi,
  readStoredAuthSession,
  storeAuthSession,
  transactionApi,
} from './services/api';
import { useInvestmentStore } from './store/useInvestmentStore';

function extractPublicShareToken() {
  const match = window.location.pathname.match(/^\/shared\/portfolio\/([^/]+)$/);
  return match?.[1] ?? null;
}

function normalizePositions(data) {
  return Array.isArray(data)
    ? data.map((item) => ({
        stock_code: item.stock_code,
        total_shares: Number(item.total_shares ?? 0),
        average_price: Number(item.average_price ?? 0),
        last_price: Number(item.last_price ?? 0),
        last_price_date: item.last_price_date ?? null,
        last_sync_at: item.last_sync_at ?? null,
        invested_amount: Number(item.invested_amount ?? 0),
        market_value: Number(item.market_value ?? 0),
        unrealized_pnl: Number(item.unrealized_pnl ?? 0),
        realized_pnl: Number(item.realized_pnl ?? 0),
      }))
    : [];
}

function normalizeJournal(data) {
  return Array.isArray(data)
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
}

function normalizePerformance(data) {
  if (Array.isArray(data)) {
    return {
      meta: { benchmark: 'IHSG', method: 'normalized_nav', base_index: 100 },
      summary: null,
      series: data.map((item) => ({
        ...item,
        portfolio_index: Number(item.portfolio ?? 100),
        benchmark_index: Number(item.ihsg ?? 100),
      })),
    };
  }

  return {
    meta: data?.meta ?? null,
    summary: data?.summary ?? null,
    series: Array.isArray(data?.series) ? data.series : [],
  };
}

function App() {
  const publicShareToken = extractPublicShareToken();
  const [authMode, setAuthMode] = useState('login');
  const [sessionUser, setSessionUser] = useState(() => readStoredAuthSession()?.user || null);
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(readStoredAuthSession()?.token));
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [authError, setAuthError] = useState('');
  const [loginForm, setLoginForm] = useState({
    identity: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    identity: '',
    password: '',
  });

  if (publicShareToken) {
    return <PublicPortfolioApp shareToken={publicShareToken} />;
  }

  function handleLoginInputChange(event) {
    const { name, value } = event.target;
    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleRegisterInputChange(event) {
    const { name, value } = event.target;
    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  useEffect(() => {
    const storedSession = readStoredAuthSession();
    if (!storedSession?.token) {
      setIsCheckingSession(false);
      return;
    }

    let active = true;

    async function hydrateSession() {
      try {
        const data = await authApi.me();
        if (!active) {
          return;
        }

        const nextSession = {
          token: storedSession.token,
          user: data.user,
        };
        storeAuthSession(nextSession);
        setSessionUser(data.user);
      } catch {
        clearAuthSession();
        if (active) {
          setSessionUser(null);
        }
      } finally {
        if (active) {
          setIsCheckingSession(false);
        }
      }
    }

    hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  async function handleRegister(event) {
    event.preventDefault();
    setAuthError('');
    setAuthNotice('');

    const name = registerForm.name.trim();
    const identity = registerForm.identity.trim();
    const password = registerForm.password;

    if (!name || !identity || !password) {
      setAuthError('Semua field register wajib diisi.');
      return;
    }

    setIsSubmittingAuth(true);

    try {
      await authApi.register({
        name,
        identity,
        password,
      });
      setAuthNotice('Register berhasil. Silakan login dengan akun baru Anda.');
      setAuthMode('login');
      setRegisterForm({
        name: '',
        identity: '',
        password: '',
      });
      setLoginForm({
        identity,
        password: '',
      });
    } catch (error) {
      const message =
        error?.response?.data?.errors?.identity?.[0] ||
        error?.response?.data?.message ||
        'Register gagal. Silakan coba lagi.';
      setAuthError(message);
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError('');
    setAuthNotice('');

    const identity = loginForm.identity.trim();
    const password = loginForm.password;

    if (!identity || !password) {
      setAuthError('Email / nohp dan password wajib diisi.');
      return;
    }

    setIsSubmittingAuth(true);

    try {
      const data = await authApi.login({
        identity,
        password,
      });
      const nextSession = {
        token: data.token,
        user: data.user,
      };
      storeAuthSession(nextSession);
      setSessionUser(data.user);
      setLoginForm({
        identity: '',
        password: '',
      });
    } catch (error) {
      const message =
        error?.response?.data?.errors?.identity?.[0] ||
        error?.response?.data?.message ||
        'Login gagal. Periksa email / nohp dan password Anda.';
      setAuthError(message);
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Clear local session even when logout request fails.
    } finally {
      clearAuthSession();
      setSessionUser(null);
      setAuthMode('login');
      setAuthNotice('Sesi login telah berakhir.');
      setAuthError('');
    }
  }

  if (isCheckingSession) {
    return (
      <div className="app-shell auth-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <main className="auth-main">
          <section className="auth-card panel">
            <h2>Memeriksa sesi login...</h2>
          </section>
        </main>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="app-shell auth-shell">
        <div className="ambient ambient-a" />
        <div className="ambient ambient-b" />
        <main className="auth-main">
          <section className="auth-hero">
            <p className="eyebrow">Investment Journal</p>
            <h1>Login dulu untuk akses dashboard investasi Anda.</h1>
            <p className="subtitle">
              Register hanya butuh nama, email / nohp, dan password. Setelah login, seluruh fitur aplikasi baru
              akan terbuka.
            </p>
          </section>

          <section className="auth-card panel">
            <div className="auth-tabs" role="tablist" aria-label="Pilih halaman autentikasi">
              <button
                type="button"
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setAuthNotice('');
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                  setAuthNotice('');
                }}
              >
                Register
              </button>
            </div>

            {authNotice ? <div className="notice">{authNotice}</div> : null}
            {authError ? <div className="notice notice-error">{authError}</div> : null}

            {authMode === 'login' ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <label>
                  Email / nohp
                  <input
                    type="text"
                    name="identity"
                    placeholder="nama@email.com atau 0812xxxx"
                    value={loginForm.identity}
                    onChange={handleLoginInputChange}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="Masukkan password"
                    value={loginForm.password}
                    onChange={handleLoginInputChange}
                  />
                </label>
                <button type="submit" className="submit-btn auth-submit-btn" disabled={isSubmittingAuth}>
                  {isSubmittingAuth ? 'Memproses...' : 'Masuk ke aplikasi'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegister}>
                <label>
                  Nama
                  <input
                    type="text"
                    name="name"
                    placeholder="Nama lengkap"
                    value={registerForm.name}
                    onChange={handleRegisterInputChange}
                  />
                </label>
                <label>
                  Email / nohp
                  <input
                    type="text"
                    name="identity"
                    placeholder="nama@email.com atau 0812xxxx"
                    value={registerForm.identity}
                    onChange={handleRegisterInputChange}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="Buat password"
                    value={registerForm.password}
                    onChange={handleRegisterInputChange}
                  />
                </label>
                <button type="submit" className="submit-btn auth-submit-btn" disabled={isSubmittingAuth}>
                  {isSubmittingAuth ? 'Memproses...' : 'Buat akun'}
                </button>
              </form>
            )}
          </section>
        </main>
      </div>
    );
  }

  return <AuthenticatedApp sessionUser={sessionUser} onLogout={handleLogout} />;
}

function AuthenticatedApp({ sessionUser, onLogout }) {
  const {
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
  } = useInvestmentStore();

  const [notice, setNotice] = useState('');
  const [activeView, setActiveView] = useState('dashboard');
  const [journalData, setJournalData] = useState([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [capitalSummary, setCapitalSummary] = useState(null);
  const [isSyncingSpreadsheet, setIsSyncingSpreadsheet] = useState(false);
  const [isUpdatingSharing, setIsUpdatingSharing] = useState(false);

  async function loadPositions(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      setPositions([]);
      return;
    }

    try {
      const data = await portfolioApi.listPositions(portfolioId);
      setPositions(normalizePositions(data));
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
      setJournalData(normalizeJournal(data));
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
      setPerformanceData({ meta: null, summary: null, series: [] });
      return;
    }

    try {
      const data = await portfolioApi.performance(portfolioId);
      setPerformanceData(normalizePerformance(data));
    } catch {
      setPerformanceData({ meta: null, summary: null, series: [] });
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

  async function refreshPortfolioData(portfolioId = selectedPortfolioId) {
    if (!portfolioId) {
      return;
    }

    await Promise.all([
      loadPositions(portfolioId),
      loadJournal(portfolioId),
      loadCashBalance(portfolioId),
      loadCapitalSummary(portfolioId),
      loadPerformanceData(portfolioId),
    ]);
  }

  async function handleSubmitTransaction(entry) {
    const skipRefresh = Boolean(entry.__skipRefresh);
    const skipNotice = Boolean(entry.__skipNotice);

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

      if (!skipRefresh) {
        await refreshPortfolioData(entry.portfolio_id);
      }

      const message = `Transaksi ${entry.type} untuk portfolio ${selectedPortfolio?.name || '-'} berhasil dicatat.`;
      if (!skipNotice) {
        setNotice(message);
      }
      return { success: true, message };
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal menyimpan transaksi ke API.';
      if (!skipNotice) {
        setNotice(message);
      }
      throw new Error(message);
    } finally {
      if (!skipNotice) {
        setTimeout(() => setNotice(''), 2400);
      }
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

  async function handleUpdateSharing(portfolioId, isPublic) {
    try {
      setIsUpdatingSharing(true);
      const updated = await portfolioApi.updateSharing(portfolioId, { is_public: isPublic });
      setPortfolios((current) =>
        current.map((item) => (item.id === portfolioId ? { ...item, ...updated } : item))
      );
      await refreshPortfolioData(portfolioId);
      setNotice(
        updated?.is_public
          ? `Portfolio ${updated.name} sekarang public dan bisa dibagikan lewat link.`
          : `Portfolio ${updated.name} sekarang private.`
      );
    } catch (error) {
      const message = error?.response?.data?.message || 'Gagal mengubah pengaturan share portfolio.';
      setNotice(message);
    } finally {
      setIsUpdatingSharing(false);
      setTimeout(() => setNotice(''), 2400);
    }
  }

  async function handleCopyShareLink(portfolio) {
    const shareLink = `${window.location.origin}/shared/portfolio/${portfolio.share_token}`;

    try {
      await navigator.clipboard.writeText(shareLink);
      setNotice('Link portfolio public berhasil disalin.');
    } catch {
      window.prompt('Salin link portfolio public ini:', shareLink);
      setNotice('Link portfolio public siap disalin.');
    } finally {
      setTimeout(() => setNotice(''), 2400);
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <main className="app-main">
        <Header userName={sessionUser?.name} onLogout={onLogout} />

        {notice ? <div className="notice">{notice}</div> : null}

        <PortfolioSelector
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          selectedPortfolio={selectedPortfolio}
          onChange={handleChangePortfolio}
          onOpenCreateForm={() => setActiveView('portfolio-create')}
          onSharingChange={handleUpdateSharing}
          onCopyShareLink={handleCopyShareLink}
          updatingSharing={isUpdatingSharing}
          showCreateButton={activeView !== 'transactions'}
        />

        {activeView === 'portfolio-create' ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Form Portfolio</h2>
                <div className="panel-head-actions">
                  <button type="button" className="table-btn table-btn-muted" onClick={() => setActiveView('dashboard')}>
                    Kembali ke Dashboard
                  </button>
                </div>
              </div>
            </section>
            <PortfolioForm onSubmit={handleCreatePortfolio} creating={isCreatingPortfolio} />
          </>
        ) : activeView === 'transactions' ? (
          <>
            <section className="panel">
              <div className="panel-head">
                <h2>Form Transaksi</h2>
                <div className="panel-head-actions">
                  <button type="button" className="table-btn table-btn-muted" onClick={() => setActiveView('dashboard')}>
                    Kembali ke Dashboard
                  </button>
                </div>
              </div>
            </section>
            <TransactionForm
              portfolioId={selectedPortfolioId}
              onSubmit={handleSubmitTransaction}
              onBulkComplete={refreshPortfolioData}
            />
          </>
        ) : (
          <>
            <section className="two-col">
              <PerformanceChart data={performanceData} />
              <CapitalComparisonChart data={performanceData} summary={summary} capitalSummary={capitalSummary} />
            </section>
            <SummaryCards summary={summary} cashBalance={cashBalance} capitalSummary={capitalSummary} />
            <PositionsTable
              summary={summary}
              positions={positions}
              onUpdateLastPrice={handleUpdateLastPrice}
              onSyncSpreadsheet={handleSyncSpreadsheet}
              syncing={isSyncingSpreadsheet}
            />
            <JournalTable
              data={journalData}
              onEdit={handleEditJournal}
              onDelete={handleDeleteJournal}
              onOpenTransactionForm={() => setActiveView('transactions')}
            />
          </>
        )}
      </main>
    </div>
  );
}

function PublicPortfolioApp({ shareToken }) {
  const [notice, setNotice] = useState('');
  const [portfolio, setPortfolio] = useState(null);
  const [positions, setPositions] = useState([]);
  const [journalData, setJournalData] = useState([]);
  const [capitalSummary, setCapitalSummary] = useState(null);
  const [performanceData, setPerformanceData] = useState({ meta: null, summary: null, series: [] });

  useEffect(() => {
    let active = true;

    async function loadPublicPortfolio() {
      try {
        const data = await portfolioApi.getPublicPortfolio(shareToken);
        if (!active) {
          return;
        }

        setPortfolio(data?.portfolio ?? null);
        setPositions(normalizePositions(data?.positions ?? []));
        setJournalData(normalizeJournal(data?.journal ?? []));
        setCapitalSummary(data?.capital_summary ?? null);
        setPerformanceData(normalizePerformance(data?.performance ?? { meta: null, summary: null, series: [] }));
      } catch (error) {
        if (!active) {
          return;
        }

        setNotice(error?.response?.data?.message || 'Portfolio public tidak ditemukan atau tidak lagi tersedia.');
      }
    }

    loadPublicPortfolio();

    return () => {
      active = false;
    };
  }, [shareToken]);

  const summary = {
    invested: positions.reduce((acc, item) => acc + Number(item.invested_amount ?? 0), 0),
    marketValue: positions.reduce((acc, item) => acc + Number(item.market_value ?? 0), 0),
    unrealized: positions.reduce((acc, item) => acc + Number(item.unrealized_pnl ?? 0), 0),
    realized: positions.reduce((acc, item) => acc + Number(item.realized_pnl ?? 0), 0),
    pnlPercent: 0,
  };

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <main className="app-main">
        <Header />
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2 style={{ marginBottom: '0.25rem' }}>{portfolio?.name || 'Portfolio Public'}</h2>
              <p style={{ margin: 0, color: 'var(--muted-text, #64748b)' }}>
                Tampilan read-only. Data hanya bisa dilihat lewat link ini.
              </p>
            </div>
          </div>
        </section>
        {notice ? <div className="notice notice-error">{notice}</div> : null}
        <section className="two-col">
          <PerformanceChart data={performanceData} />
          <CapitalComparisonChart data={performanceData} summary={summary} capitalSummary={capitalSummary} />
        </section>
        <SummaryCards summary={summary} cashBalance={Number(capitalSummary?.cash_balance ?? 0)} capitalSummary={capitalSummary} />
        <PositionsTable
          summary={summary}
          positions={positions}
          onUpdateLastPrice={() => {}}
          onSyncSpreadsheet={() => {}}
          readOnly
        />
        <JournalTable data={journalData} onEdit={() => {}} onDelete={() => {}} onOpenTransactionForm={() => {}} readOnly />
      </main>
    </div>
  );
}

export default App;
