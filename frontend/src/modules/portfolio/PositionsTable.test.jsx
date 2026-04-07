import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PositionsTable from './PositionsTable';

const props = {
  positions: [
    {
      stock_code: 'BBCA',
      total_shares: 200,
      average_price: 9000,
      last_price: 9500,
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
    expect(screen.getByText((content) => content.includes('1.800.000') && content.includes('94.74%'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('1.900.000') && content.includes('105.56%'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('100.000') && content.includes('5.55%'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Rp') && content.includes('1.900.000') && content.includes('100.00%'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Rp') && content.includes('1.800.000') && content.includes('100.00%'))).toBeInTheDocument();
    expect(screen.getAllByText(/\(100\.00%\)/)).toHaveLength(2);
    expect(screen.getByText(/\(5\.56%\)/)).toBeInTheDocument();
    expect(props.onSyncSpreadsheet).toHaveBeenCalledTimes(1);
  });

  it('allows editing last price', async () => {
    render(<PositionsTable {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Last Price' }));
    fireEvent.change(screen.getByDisplayValue('9500'), { target: { value: '9600' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));

    await waitFor(() => {
      expect(props.onUpdateLastPrice).toHaveBeenCalledWith('BBCA', 9600);
    });
  });
});
