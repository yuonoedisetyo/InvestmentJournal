import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import TransactionsScreen from './TransactionsScreen';
import { stockApi } from '../services/api';
import { sampleJournal, samplePortfolios } from '../test-utils/mockData';

jest.mock('../services/api', () => ({
  stockApi: {
    listMasterStocks: jest.fn(),
  },
}));

describe('TransactionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats nominal and submits numeric cash transaction', async () => {
    const onSubmitTransaction = jest.fn().mockResolvedValue({ message: 'Transaksi TOPUP berhasil dicatat.' });

    render(
      <TransactionsScreen
        portfolios={samplePortfolios}
        selectedPortfolioId={1}
        onSelectPortfolio={jest.fn()}
        journal={sampleJournal}
        onSubmitTransaction={onSubmitTransaction}
        onRefresh={jest.fn()}
        refreshing={false}
        notice=""
      />
    );

    fireEvent.changeText(screen.getByPlaceholderText('500.000'), '1250000');
    expect(screen.getByDisplayValue('1.250.000')).toBeTruthy();
    fireEvent.press(screen.getByText('Simpan Transaksi'));

    await waitFor(() => {
      expect(onSubmitTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolio_id: 1,
          type: 'TOPUP',
          amount: 1250000,
        })
      );
    });

    expect(await screen.findByText('Transaksi TOPUP berhasil dicatat.')).toBeTruthy();
  });

  it('loads stock suggestions for stock transactions', async () => {
    stockApi.listMasterStocks.mockResolvedValue([{ stock_code: 'BBCA', stock_name: 'BCA' }]);

    render(
      <TransactionsScreen
        portfolios={samplePortfolios}
        selectedPortfolioId={1}
        onSelectPortfolio={jest.fn()}
        journal={sampleJournal}
        onSubmitTransaction={jest.fn()}
        onRefresh={jest.fn()}
        refreshing={false}
        notice=""
      />
    );

    fireEvent.press(screen.getByText('Beli Saham'));
    fireEvent.changeText(screen.getByPlaceholderText('BBCA'), 'bbca');

    await waitFor(() => {
      expect(stockApi.listMasterStocks).toHaveBeenCalledWith({ q: 'BBCA', limit: 8 });
    });

    expect(await screen.findByText('Saran: BBCA')).toBeTruthy();
  });
});
