import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const normalizedBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api`;
const AUTH_STORAGE_KEY = 'investment-journal-auth-user';

const api = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 15000,
});

export function readStoredAuthSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function storeAuthSession(session) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  if (session?.token) {
    localStorage.setItem('token', session.token);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('token');
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  async login(payload) {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },
  async logout() {
    const { data } = await api.post('/auth/logout');
    return data;
  },
};

export const portfolioApi = {
  async listPortfolios() {
    const { data } = await api.get('/portfolios');
    return data;
  },
  async listPositions(portfolioId) {
    const { data } = await api.get(`/portfolios/${portfolioId}/positions`);
    return data;
  },
  async cashBalance(portfolioId) {
    const { data } = await api.get(`/portfolios/${portfolioId}/cash-balance`);
    return data;
  },
  async capitalSummary(portfolioId) {
    const { data } = await api.get(`/portfolios/${portfolioId}/capital-summary`);
    return data;
  },
  async performance(portfolioId, params) {
    const { data } = await api.get(`/portfolios/${portfolioId}/performance`, { params });
    return data;
  },
  async createPortfolio(payload) {
    const { data } = await api.post('/portfolios', payload);
    return data;
  },
  async activatePortfolio(portfolioId) {
    const { data } = await api.patch(`/portfolios/${portfolioId}/activate`);
    return data;
  },
};

export const transactionApi = {
  async listJournal(portfolioId) {
    const { data } = await api.get('/transactions', {
      params: portfolioId ? { portfolio_id: portfolioId } : undefined,
    });
    return data;
  },
  async buy(payload) {
    const { data } = await api.post('/transactions/buy', payload);
    return data;
  },
  async sell(payload) {
    const { data } = await api.post('/transactions/sell', payload);
    return data;
  },
  async topup(payload) {
    // Optional endpoint; fallback to local journal if endpoint not available.
    const { data } = await api.post('/cash/topup', payload);
    return data;
  },
  async withdraw(payload) {
    const { data } = await api.post('/cash/withdraw', payload);
    return data;
  },
  async addDividend(payload) {
    const { data } = await api.post('/dividends/manual', payload);
    return data;
  },
  async updateDividend(dividendId, payload) {
    const { data } = await api.patch(`/dividends/${dividendId}`, payload);
    return data;
  },
  async deleteDividend(dividendId) {
    const { data } = await api.delete(`/dividends/${dividendId}`);
    return data;
  },
  async updateJournal(transactionId, payload) {
    const { data } = await api.patch(`/transactions/${transactionId}`, payload);
    return data;
  },
  async deleteJournal(transactionId) {
    const { data } = await api.delete(`/transactions/${transactionId}`);
    return data;
  },
  async updateCashMutation(mutationId, payload) {
    const { data } = await api.patch(`/cash/mutations/${mutationId}`, payload);
    return data;
  },
  async deleteCashMutation(mutationId) {
    const { data } = await api.delete(`/cash/mutations/${mutationId}`);
    return data;
  },
};

export const analyticsApi = {
  async portfolioSummary(portfolioId) {
    const { data } = await api.get(`/analytics/portfolio/${portfolioId}`);
    return data;
  },
  async performanceCompare(portfolioId) {
    const { data } = await api.get(`/analytics/performance/${portfolioId}`);
    return data;
  },
};

export const priceApi = {
  async manualUpdate(payload) {
    const { data } = await api.post('/prices/manual', payload);
    return data;
  },
  async readSpreadsheet(payload) {
    const { data } = await api.post('/prices/read-spreadsheet', payload);
    return data;
  },
};

export const stockApi = {
  async listMasterStocks(params) {
    const { data } = await api.get('/master/stocks', { params });
    return data;
  },
};

export default api;
