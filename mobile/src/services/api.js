import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AUTH_STORAGE_KEY = 'investment-journal-mobile-auth';
const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const normalizedBaseUrl = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: normalizedBaseUrl,
  timeout: 15000,
});

export async function readStoredSession() {
  try {
    const rawValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    const parsed = JSON.parse(rawValue || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function storeSession(session) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}

api.interceptors.request.use(async (config) => {
  const storedSession = await readStoredSession();
  if (storedSession?.token) {
    config.headers.Authorization = `Bearer ${storedSession.token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearStoredSession();
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
  async createPortfolio(payload) {
    const { data } = await api.post('/portfolios', payload);
    return data;
  },
  async activatePortfolio(portfolioId) {
    const { data } = await api.patch(`/portfolios/${portfolioId}/activate`);
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
  async performance(portfolioId) {
    const { data } = await api.get(`/portfolios/${portfolioId}/performance`);
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
};

export const stockApi = {
  async listMasterStocks(params) {
    const { data } = await api.get('/master/stocks', { params });
    return data;
  },
};

export default api;
