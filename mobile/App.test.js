import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import App from './App';
import { sampleJournal, samplePortfolios, samplePositions, sampleUser } from './src/test-utils/mockData';
import {
  authApi,
  clearStoredSession,
  portfolioApi,
  readStoredSession,
  storeSession,
  transactionApi,
} from './src/services/api';

jest.mock('./src/services/api', () => ({
  authApi: {
    me: jest.fn(),
    logout: jest.fn(),
  },
  readStoredSession: jest.fn(),
  storeSession: jest.fn(),
  clearStoredSession: jest.fn(),
  portfolioApi: {
    listPortfolios: jest.fn(),
    listPositions: jest.fn(),
    cashBalance: jest.fn(),
    capitalSummary: jest.fn(),
    performance: jest.fn(),
    activatePortfolio: jest.fn(),
    createPortfolio: jest.fn(),
  },
  transactionApi: {
    listJournal: jest.fn(),
    buy: jest.fn(),
    sell: jest.fn(),
    topup: jest.fn(),
    withdraw: jest.fn(),
    addDividend: jest.fn(),
  },
}));

describe('Mobile App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows auth screen when there is no stored session', async () => {
    readStoredSession.mockResolvedValue(null);

    render(<App />);

    expect(await screen.findByText('Login dulu untuk akses dashboard investasi di ponsel.')).toBeTruthy();
  });

  it('hydrates session and renders dashboard content', async () => {
    readStoredSession.mockResolvedValue({ token: 'token-123', user: sampleUser });
    authApi.me.mockResolvedValue({ user: sampleUser });
    storeSession.mockResolvedValue();
    portfolioApi.listPortfolios.mockResolvedValue(samplePortfolios);
    portfolioApi.listPositions.mockResolvedValue(samplePositions);
    portfolioApi.cashBalance.mockResolvedValue({ cash_balance: '500000' });
    portfolioApi.capitalSummary.mockResolvedValue({ total_capital: '2300000' });
    portfolioApi.performance.mockResolvedValue([{ date: '2026-03-21', portfolio: 101.2, ihsg: 100.5 }]);
    transactionApi.listJournal.mockResolvedValue(sampleJournal);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Pantau investasi dari ponsel Anda')).toBeTruthy();
      expect(screen.getByText('Portfolio Aktif')).toBeTruthy();
      expect(screen.getByText('Utama')).toBeTruthy();
    });
  });
});
