import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TransactionForm from './TransactionForm';
import { stockApi } from '../../services/api';
import * as XLSX from 'xlsx';

vi.mock('../../services/api', async () => {
  const actual = await vi.importActual('../../services/api');
  return {
    ...actual,
    stockApi: {
      listMasterStocks: vi.fn(),
    },
  };
});

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    book_new: vi.fn(),
    aoa_to_sheet: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('TransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('shows error feedback and keeps form values when submit fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Gagal menyimpan transaksi ke API.'));

    render(<TransactionForm portfolioId={11} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Jenis Transaksi'), { target: { value: 'TOPUP' } });
    fireEvent.change(screen.getByLabelText('Nominal'), { target: { value: '1250000' } });
    fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: 'Setor dana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Transaksi' }));

    expect(await screen.findByText('Gagal menyimpan transaksi ke API.')).toBeInTheDocument();
    expect(screen.getByLabelText('Jenis Transaksi')).toHaveValue('TOPUP');
    expect(screen.getByLabelText('Catatan')).toHaveValue('Setor dana');
    expect(screen.getByLabelText('Nominal')).toHaveValue('1.250.000');
  });

  it('parses excel rows, previews them, and submits valid bulk transactions', async () => {
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    });
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        type: 'BUY',
        transaction_date: '29/03/2026',
        stock_code: 'bbca',
        lot: '2',
        price: '9000',
        fee: '1000',
        notes: 'First buy',
      },
      {
        type: 'TOPUP',
        transaction_date: '29/03/2026',
        amount: '500000',
        notes: 'Modal awal',
      },
    ]);

    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    const onBulkComplete = vi.fn().mockResolvedValue(undefined);

    render(<TransactionForm portfolioId={15} onSubmit={onSubmit} onBulkComplete={onBulkComplete} />);

    fireEvent.change(screen.getByLabelText('Mode Input'), { target: { value: 'bulk' } });

    const file = new File(['dummy'], 'transactions.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    fireEvent.change(screen.getByLabelText('Upload File Excel'), {
      target: { files: [file] },
    });

    expect(await screen.findByText('Preview 2 baris. Valid: 2. Invalid: 0.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Import Transaksi Excel' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    expect(onSubmit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        portfolio_id: 15,
        type: 'BUY',
        transaction_date: '2026-03-29',
        stock_code: 'BBCA',
        lot: 2,
        price: 9000,
        fee: 1000,
        __skipRefresh: true,
        __skipNotice: true,
      })
    );
    expect(onSubmit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        portfolio_id: 15,
        type: 'TOPUP',
        transaction_date: '2026-03-29',
        amount: 500000,
        __skipRefresh: true,
        __skipNotice: true,
      })
    );
    expect(onBulkComplete).toHaveBeenCalledWith(15);
    expect(await screen.findByText('2 transaksi berhasil diimport dari file Excel.')).toBeInTheDocument();
  });

  it('flags invalid excel rows before bulk submit', async () => {
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {},
      },
    });
    XLSX.utils.sheet_to_json.mockReturnValue([
      {
        type: 'BUY',
        transaction_date: '29/03/2026',
        stock_code: '',
        lot: '0',
        price: '',
      },
    ]);

    const onSubmit = vi.fn();

    render(<TransactionForm portfolioId={12} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Mode Input'), { target: { value: 'bulk' } });

    const file = new File(['dummy'], 'invalid.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    fireEvent.change(screen.getByLabelText('Upload File Excel'), {
      target: { files: [file] },
    });

    expect(await screen.findByText('Preview 1 baris. Valid: 0. Invalid: 1.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Import Transaksi Excel' }));

    expect(await screen.findByText('Masih ada baris yang invalid. Perbaiki file Excel lalu upload ulang.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('downloads excel template with accepted columns', async () => {
    const workbook = {};
    const worksheet = {};
    XLSX.utils.book_new.mockReturnValue(workbook);
    XLSX.utils.aoa_to_sheet.mockReturnValue(worksheet);

    render(<TransactionForm portfolioId={12} onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Mode Input'), { target: { value: 'bulk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download Template Excel' }));

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['type', 'transaction_date', 'stock_code', 'lot', 'price', 'fee', 'amount', 'notes'],
      ])
    );
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(workbook, worksheet, 'Template');
    expect(XLSX.writeFile).toHaveBeenCalledWith(workbook, 'template-transaksi-bulk.xlsx');
  });
});
