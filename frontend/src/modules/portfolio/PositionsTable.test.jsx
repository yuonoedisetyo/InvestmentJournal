import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PositionsTable from './PositionsTable';

const props = {
  positions: [
    {
      stock_code: 'BBCA',
      total_shares: 200,
      average_price: 9000,
      last_price: 9500,
      last_sync_at: '2026-04-19T09:45:00.000Z',
      invested_amount: 1800000,
      market_value: 1900000,
      unrealized_pnl: 100000,
    },
  ],
  summary: {
    invested: 1800000,
    marketValue: 1900000,
    unrealized: 100000,
    pnlPercent: 5.55,
  },
  onUpdateLastPrice: vi.fn().mockResolvedValue({}),
  onSyncSpreadsheet: vi.fn(),
};

describe('PositionsTable', () => {
  it('renders positions and triggers spreadsheet sync', () => {
    render(<PositionsTable {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync Harga' }));

    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('BBCA')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('100.000') && content.includes('5.55%'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Rp') && content.includes('1.900.000') && content.includes('100.00%'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Rp') && content.includes('1.800.000') && content.includes('100.00%'))).toBeInTheDocument();
    expect(screen.getAllByText(/\(100\.00%\)/)).toHaveLength(2);
    expect(screen.getByText(/\(5\.56%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Terakhir sync harga:/)).toBeInTheDocument();
    expect(props.onSyncSpreadsheet).toHaveBeenCalledTimes(1);
  });

  it('renders last price value from positions data', async () => {
    render(<PositionsTable {...props} />);

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('9.500'))).toBeInTheDocument();
    });
  });
});
