import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TransactionForm from './TransactionForm';
import { stockApi } from '../../services/api';

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual('../../services/api');
  return {
    ...actual,
    stockApi: {
      listMasterStocks: vi.fn(),
    },
  };
});

describe('TransactionForm', () => {
  it('submits cash transaction payload', () => {
    const onSubmit = vi.fn();

    render(<TransactionForm portfolioId={7} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Jenis Transaksi'), { target: { value: 'TOPUP' } });
    fireEvent.change(screen.getByLabelText('Nominal'), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio_id: 7,
        type: 'TOPUP',
        amount: 500000,
      })
    );
  });

  it('loads stock options and submits stock transaction', async () => {
    stockApi.listMasterStocks.mockResolvedValue([{ stock_code: 'BBCA', stock_name: 'BCA' }]);
    const onSubmit = vi.fn();

    render(<TransactionForm portfolioId={9} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Jenis Transaksi'), { target: { value: 'BUY' } });
    fireEvent.change(screen.getByLabelText('Kode Saham'), { target: { value: 'bbca' } });

    await waitFor(() => {
      expect(stockApi.listMasterStocks).toHaveBeenCalledWith({ q: 'BBCA', limit: 10 });
    }, { timeout: 2000 });

    fireEvent.change(screen.getByLabelText('Lot'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Harga'), { target: { value: '9000' } });
    fireEvent.change(screen.getByLabelText('Fee'), { target: { value: '1000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolio_id: 9,
        type: 'BUY',
        stock_code: 'BBCA',
        lot: 2,
        price: 9000,
        fee: 1000,
      })
    );
  });
});
