import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockAuthApi = {
  register: vi.fn(),
  login: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
};

const mockPortfolioApi = {
  listPositions: vi.fn(),
  cashBalance: vi.fn(),
  capitalSummary: vi.fn(),
  performance: vi.fn(),
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
vi.mock('./modules/dashboard/SummaryCards', () => ({
  default: () => <div>SummaryCards</div>,
}));
vi.mock('./modules/portfolio/PortfolioSelector', () => ({
  default: () => <div>PortfolioSelector</div>,
}));
vi.mock('./modules/portfolio/PositionsTable', () => ({
  default: () => <div>PositionsTable</div>,
}));
vi.mock('./modules/transactions/JournalTable', () => ({
  default: () => <div>JournalTable</div>,
}));
vi.mock('./modules/transactions/TransactionForm', () => ({
  default: () => <div>TransactionForm</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockReadStoredAuthSession.mockReturnValue(null);
    mockUseInvestmentStore.mockReturnValue({
      portfolios: [],
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

  it('renders login screen and can register', async () => {
    const { default: App } = await import('./App');
    mockAuthApi.register.mockResolvedValue({});

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

    expect(screen.getByText('Header Persisted User')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Logout Header'));

    await waitFor(() => {
      expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
    });

    expect(mockClearAuthSession).toHaveBeenCalled();
    expect(screen.getByText('Sesi login telah berakhir.')).toBeInTheDocument();
  });
});
