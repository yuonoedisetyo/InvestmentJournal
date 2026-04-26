import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockAuthApi = {
  register: vi.fn(),
  login: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
};

const mockPortfolioApi = {
  listPublicPortfolios: vi.fn(),
  getPublicPortfolio: vi.fn(),
  listPositions: vi.fn(),
  cashBalance: vi.fn(),
  capitalSummary: vi.fn(),
  performance: vi.fn(),
  updateSharing: vi.fn(),
};

const mockTransactionApi = {
  listJournal: vi.fn(),
  buy: vi.fn(),
  sell: vi.fn(),
  addDividend: vi.fn(),
  topup: vi.fn(),
  withdraw: vi.fn(),
};

const mockPriceApi = {
  manualUpdate: vi.fn(),
  readSpreadsheet: vi.fn(),
};

const mockReadStoredAuthSession = vi.fn();
const mockStoreAuthSession = vi.fn();
const mockClearAuthSession = vi.fn();

const mockUseInvestmentStore = vi.fn();

vi.mock('./services/api', async () => ({
  authApi: mockAuthApi,
  portfolioApi: mockPortfolioApi,
  transactionApi: mockTransactionApi,
  priceApi: mockPriceApi,
  readStoredAuthSession: mockReadStoredAuthSession,
  storeAuthSession: mockStoreAuthSession,
  clearAuthSession: mockClearAuthSession,
}));

vi.mock('./store/useInvestmentStore', () => ({
  useInvestmentStore: () => mockUseInvestmentStore(),
}));

vi.mock('./components/Header', () => ({
  default: ({ userName, onLogout }) => (
    <div>
      <span>Header {userName}</span>
      <button onClick={onLogout}>Logout Header</button>
    </div>
  ),
}));

vi.mock('./modules/dashboard/PerformanceChart', () => ({
  default: () => <div>PerformanceChart</div>,
}));
vi.mock('./modules/dashboard/CapitalComparisonChart', () => ({
  default: () => <div>CapitalComparisonChart</div>,
}));
vi.mock('./modules/dashboard/SummaryCards', () => ({
  default: () => <div>SummaryCards</div>,
}));
vi.mock('./modules/portfolio/PortfolioForm', () => ({
  default: () => <div>PortfolioForm</div>,
}));
vi.mock('./modules/portfolio/PortfolioSelector', () => ({
  default: ({ onOpenCreateForm, showCreateButton = true }) => (
    <div>
      <div>PortfolioSelector</div>
      {showCreateButton ? <button onClick={onOpenCreateForm}>Add Portfolio</button> : null}
    </div>
  ),
}));
vi.mock('./modules/portfolio/PositionsTable', () => ({
  default: ({ readOnly = false }) => <div>{readOnly ? 'PositionsTable ReadOnly' : 'PositionsTable'}</div>,
}));
vi.mock('./modules/transactions/JournalTable', () => ({
  default: ({ onOpenTransactionForm, readOnly = false }) => (
    <div>
      <div>{readOnly ? 'JournalTable ReadOnly' : 'JournalTable'}</div>
      {!readOnly ? <button onClick={onOpenTransactionForm}>Input Transaksi</button> : null}
    </div>
  ),
}));
vi.mock('./modules/transactions/TransactionForm', () => ({
  default: () => <div>TransactionForm</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');

    mockReadStoredAuthSession.mockReturnValue(null);
    mockPortfolioApi.listPublicPortfolios.mockResolvedValue([]);
    mockUseInvestmentStore.mockReturnValue({
      portfolios: [],
      setPortfolios: vi.fn(),
      selectedPortfolio: null,
      selectedPortfolioId: null,
      setActivePortfolio: vi.fn(),
      createPortfolio: vi.fn(),
      isCreatingPortfolio: false,
      positions: [],
      setPositions: vi.fn(),
      summary: { invested: 0, marketValue: 0, unrealized: 0, realized: 0, pnlPercent: 0 },
      performanceData: [],
      setPerformanceData: vi.fn(),
    });
  });

  it('renders landing page without login', async () => {
    const { default: App } = await import('./App');

    render(<App />);

    expect(screen.getByText(/Catat portfolio, uji valuasi DCF/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Login' })[0]).toHaveAttribute('href', '/login');
  });

  it('renders login screen on /login and can register', async () => {
    const { default: App } = await import('./App');
    mockAuthApi.register.mockResolvedValue({});
    window.history.pushState({}, '', '/login');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.change(screen.getByPlaceholderText('Nama lengkap'), { target: { value: 'Yedi' } });
    fireEvent.change(screen.getByPlaceholderText('nama@email.com atau 0812xxxx'), {
      target: { value: 'yedi@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Buat password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat akun' }));

    await waitFor(() => {
      expect(mockAuthApi.register).toHaveBeenCalledWith({
        name: 'Yedi',
        identity: 'yedi@example.com',
        password: 'secret123',
      });
    });

    expect(screen.getByText('Register berhasil. Silakan login dengan akun baru Anda.')).toBeInTheDocument();
  });

  it('can login and render authenticated app shell', async () => {
    const { default: App } = await import('./App');
    mockAuthApi.login.mockResolvedValue({
      token: 'token-123',
      user: { id: 1, name: 'Yedi', identity: 'yedi@example.com' },
    });
    window.history.pushState({}, '', '/login');

    render(<App />);

    const identityInputs = screen.getAllByPlaceholderText('nama@email.com atau 0812xxxx');
    fireEvent.change(identityInputs[0], { target: { value: 'yedi@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Masukkan password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk ke aplikasi' }));

    await waitFor(() => {
      expect(mockStoreAuthSession).toHaveBeenCalledWith({
        token: 'token-123',
        user: { id: 1, name: 'Yedi', identity: 'yedi@example.com' },
      });
    });

    expect(screen.getByText('Header Yedi')).toBeInTheDocument();
    expect(screen.getByText('PortfolioSelector')).toBeInTheDocument();
    expect(screen.getByText('CapitalComparisonChart')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Portfolio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Input Transaksi' })).toBeInTheDocument();
    expect(screen.queryByText('TransactionForm')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/app');
  });

  it('can switch to portfolio form page after login', async () => {
    const { default: App } = await import('./App');
    mockAuthApi.login.mockResolvedValue({
      token: 'token-789',
      user: { id: 3, name: 'Raka', identity: 'raka@example.com' },
    });
    window.history.pushState({}, '', '/login');

    render(<App />);

    const identityInputs = screen.getAllByPlaceholderText('nama@email.com atau 0812xxxx');
    fireEvent.change(identityInputs[0], { target: { value: 'raka@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Masukkan password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk ke aplikasi' }));

    await waitFor(() => {
      expect(screen.getByText('Header Raka')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Portfolio' }));

    expect(screen.getByText('PortfolioForm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kembali ke Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('PerformanceChart')).not.toBeInTheDocument();
  });

  it('can switch to transaction input page after login', async () => {
    const { default: App } = await import('./App');
    mockAuthApi.login.mockResolvedValue({
      token: 'token-456',
      user: { id: 2, name: 'Dian', identity: 'dian@example.com' },
    });
    window.history.pushState({}, '', '/login');

    render(<App />);

    const identityInputs = screen.getAllByPlaceholderText('nama@email.com atau 0812xxxx');
    fireEvent.change(identityInputs[0], { target: { value: 'dian@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Masukkan password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk ke aplikasi' }));

    await waitFor(() => {
      expect(screen.getByText('Header Dian')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Input Transaksi' }));

    expect(screen.getByText('TransactionForm')).toBeInTheDocument();
    expect(screen.queryByText('PerformanceChart')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kembali ke Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Portfolio' })).not.toBeInTheDocument();
  });

  it('hydrates stored session and can logout', async () => {
    const { default: App } = await import('./App');
    mockReadStoredAuthSession.mockReturnValue({
      token: 'persisted-token',
      user: { id: 1, name: 'Old' },
    });
    mockAuthApi.me.mockResolvedValue({
      user: { id: 1, name: 'Persisted User', identity: 'persisted@example.com' },
    });
    mockAuthApi.logout.mockResolvedValue({});

    render(<App />);

    await waitFor(() => {
      expect(mockAuthApi.me).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/Catat portfolio, uji valuasi DCF/)).toBeInTheDocument();

    window.history.pushState({}, '', '/app');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => {
      expect(screen.getByText('Header Persisted User')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Logout Header'));

    await waitFor(() => {
      expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
    });

    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(screen.getByText('Sesi login telah berakhir.')).toBeInTheDocument();
  });

  it('renders public portfolio share page in read-only mode', async () => {
    const { default: App } = await import('./App');

    window.history.pushState({}, '', '/shared/portfolio/share-token-123');
    mockPortfolioApi.getPublicPortfolio.mockResolvedValue({
      portfolio: { id: 1, name: 'Public Growth', currency: 'IDR', is_public: true, share_token: 'share-token-123' },
      positions: [],
      journal: [],
      capital_summary: {
        total_modal_disetor: '0.0000',
        total_topup: '0.0000',
        total_withdraw: '0.0000',
        cash_balance: '0.0000',
        net_asset_value: '0.0000',
        overall_return: { nominal: '0.0000', percent: '0.0000' },
      },
      performance: { meta: null, summary: null, series: [] },
    });

    render(<App />);

    await waitFor(() => {
      expect(mockPortfolioApi.getPublicPortfolio).toHaveBeenCalledWith('share-token-123');
    });

    expect(screen.getByText('Public Growth')).toBeInTheDocument();
    expect(screen.getByText(/Tampilan read-only/)).toBeInTheDocument();
    expect(screen.getByText('PositionsTable ReadOnly')).toBeInTheDocument();
    expect(screen.getByText('JournalTable ReadOnly')).toBeInTheDocument();
    expect(screen.queryByText('PortfolioSelector')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Input Transaksi' })).not.toBeInTheDocument();
  });

  it('renders public article detail route', async () => {
    const { default: App } = await import('./App');
    window.history.pushState({}, '', '/articles/memahami-margin-of-safety');

    render(<App />);

    expect(screen.getByText('Memahami Margin of Safety Sebelum Membeli Saham')).toBeInTheDocument();
    expect(screen.getByText(/Margin of safety membantu/)).toBeInTheDocument();
  });
});
