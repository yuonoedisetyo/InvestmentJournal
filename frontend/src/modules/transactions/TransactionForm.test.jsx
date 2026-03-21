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
  it('formats nominal, submits numeric payload, shows success feedback, and resets fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ message: 'Transaksi TOPUP berhasil dicatat.' });

    render(<TransactionForm portfolioId={7} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Jenis Transaksi'), { target: { value: 'TOPUP' } });
    fireEvent.change(screen.getByLabelText('Nominal'), { target: { value: '500000' } });
    expect(screen.getByLabelText('Nominal')).toHaveValue('500.000');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolio_id: 7,
          type: 'TOPUP',
          amount: 500000,
        })
      );
    });

    expect(await screen.findByText('Transaksi TOPUP berhasil dicatat.')).toBeInTheDocument();
    expect(screen.getByLabelText('Jenis Transaksi')).toHaveValue('');
    expect(screen.queryByLabelText('Nominal')).not.toBeInTheDocument();
  });

  it('loads stock options and submits stock transaction', async () => {
    stockApi.listMasterStocks.mockResolvedValue([{ stock_code: 'BBCA', stock_name: 'BCA' }]);
    const onSubmit = vi.fn().mockResolvedValue({ message: 'Transaksi BUY berhasil dicatat.' });

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

    await waitFor(() => {
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

  it('shows error feedback when submit fails and resets fields', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Gagal menyimpan transaksi ke API.'));

    render(<TransactionForm portfolioId={11} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Jenis Transaksi'), { target: { value: 'TOPUP' } });
    fireEvent.change(screen.getByLabelText('Nominal'), { target: { value: '1250000' } });
    fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: 'Setor dana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    expect(await screen.findByText('Gagal menyimpan transaksi ke API.')).toBeInTheDocument();
    expect(screen.getByLabelText('Jenis Transaksi')).toHaveValue('');
    expect(screen.getByLabelText('Catatan')).toHaveValue('');
    expect(screen.queryByLabelText('Nominal')).not.toBeInTheDocument();
  });
});
