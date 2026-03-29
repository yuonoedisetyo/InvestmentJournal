import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JournalTable from './JournalTable';

describe('JournalTable', () => {
  it('renders empty state', () => {
    render(<JournalTable data={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Belum ada transaksi.')).toBeInTheDocument();
  });

  it('shows stock price in the journal table', () => {
    render(
      <JournalTable
        data={[
          {
            id: 10,
            row_key: 'STOCK-10',
            entry_type: 'STOCK',
            transaction_date: '2026-03-21',
            type: 'BUY',
            stock_code: 'BBCA',
            lot: 2,
            price: 9000,
            amount: 1800000,
            fee: 1000,
            notes: 'Harga saham tampil',
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('BBCA')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s*9\.000/)).toBeInTheDocument();
  });

  it('edits a stock journal row', async () => {
    const onEdit = vi.fn().mockResolvedValue({});

    render(
      <JournalTable
        data={[
          {
            id: 1,
            row_key: 'STOCK-1',
            entry_type: 'STOCK',
            transaction_date: '2026-03-21',
            type: 'BUY',
            stock_code: 'BBCA',
            lot: 2,
            price: 9000,
            amount: 1800000,
            fee: 1000,
            notes: 'Buy',
          },
        ]}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1 }),
        expect.objectContaining({ lot: 3 })
      );
    });
  });

  it('deletes a row after confirmation', async () => {
    const onDelete = vi.fn().mockResolvedValue({});
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(
      <JournalTable
        data={[
          {
            id: 2,
            row_key: 'CASH-2',
            entry_type: 'CASH',
            transaction_date: '2026-03-21',
            type: 'TOPUP',
            stock_code: null,
            lot: null,
            price: null,
            amount: 200000,
            fee: 0,
            notes: 'Topup',
          },
        ]}
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    });
  });

  it('paginates journal rows and navigates between pages', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      row_key: `CASH-${index + 1}`,
      entry_type: 'CASH',
      transaction_date: `2026-03-${String((index % 28) + 1).padStart(2, '0')}`,
      type: 'TOPUP',
      stock_code: null,
      lot: null,
      price: null,
      amount: 1000 * (index + 1),
      fee: 0,
      notes: `Row ${index + 1}`,
    }));

    render(<JournalTable data={rows} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Menampilkan 1-10 dari 12 transaksi')).toBeInTheDocument();
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByText('Row 11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));

    await waitFor(() => {
      expect(screen.getByText('Menampilkan 11-12 dari 12 transaksi')).toBeInTheDocument();
    });

    expect(screen.getByText('Row 11')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();
  });

  it('filters rows by type and stock code', async () => {
    const rows = [
      {
        id: 1,
        row_key: 'STOCK-1',
        entry_type: 'STOCK',
        transaction_date: '2026-03-21',
        type: 'BUY',
        stock_code: 'BBCA',
        lot: 2,
        price: 9000,
        amount: 1800000,
        fee: 1000,
        notes: 'Buy BBCA',
      },
      {
        id: 2,
        row_key: 'STOCK-2',
        entry_type: 'STOCK',
        transaction_date: '2026-03-22',
        type: 'SELL',
        stock_code: 'BMRI',
        lot: 1,
        price: 6000,
        amount: 600000,
        fee: 500,
        notes: 'Sell BMRI',
      },
      {
        id: 3,
        row_key: 'CASH-3',
        entry_type: 'CASH',
        transaction_date: '2026-03-23',
        type: 'TOPUP',
        stock_code: null,
        lot: null,
        price: null,
        amount: 500000,
        fee: 0,
        notes: 'Topup',
      },
    ];

    render(<JournalTable data={rows} onEdit={vi.fn()} onDelete={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Filter Jenis'), { target: { value: 'BUY' } });
    expect(screen.getByText('Buy BBCA')).toBeInTheDocument();
    expect(screen.queryByText('Sell BMRI')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter Jenis'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filter Stock Code'), { target: { value: 'bmr' } });

    await waitFor(() => {
      expect(screen.getByText('Sell BMRI')).toBeInTheDocument();
    });

    expect(screen.queryByText('Buy BBCA')).not.toBeInTheDocument();
    expect(screen.queryByText('Topup')).not.toBeInTheDocument();
  });
});
