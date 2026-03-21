const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApi),
  },
}));

describe('api service helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('stores, reads, and clears auth session', async () => {
    const apiModule = await import('./api');

    apiModule.storeAuthSession({ token: 'abc', user: { name: 'Yedi' } });

    expect(apiModule.readStoredAuthSession()).toEqual({ token: 'abc', user: { name: 'Yedi' } });
    expect(localStorage.getItem('token')).toBe('abc');

    apiModule.clearAuthSession();

    expect(apiModule.readStoredAuthSession()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('calls auth and portfolio endpoints', async () => {
    const apiModule = await import('./api');

    mockApi.post.mockResolvedValue({ data: { ok: true } });
    mockApi.get.mockResolvedValue({ data: [] });
    mockApi.patch.mockResolvedValue({ data: { ok: true } });

    await apiModule.authApi.login({ identity: 'a', password: 'b' });
    await apiModule.authApi.register({ name: 'A', identity: 'a', password: 'b' });
    await apiModule.authApi.me();
    await apiModule.portfolioApi.listPortfolios();
    await apiModule.portfolioApi.activatePortfolio(1);

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { identity: 'a', password: 'b' });
    expect(mockApi.post).toHaveBeenCalledWith('/auth/register', { name: 'A', identity: 'a', password: 'b' });
    expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
    expect(mockApi.get).toHaveBeenCalledWith('/portfolios');
    expect(mockApi.patch).toHaveBeenCalledWith('/portfolios/1/activate');
  });
});
