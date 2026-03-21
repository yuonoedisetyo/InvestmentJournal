import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import JournalTable from './JournalTable';

describe('JournalTable', () => {
  it('renders empty state', () => {
    render(<JournalTable data={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Belum ada transaksi.')).toBeInTheDocument();
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
});
