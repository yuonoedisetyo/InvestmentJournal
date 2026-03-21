import { render, screen } from '@testing-library/react';
import SummaryCards from './SummaryCards';

describe('SummaryCards', () => {
  it('renders capital summary cards', () => {
    render(
      <SummaryCards
        summary={{ marketValue: 700000 }}
        cashBalance={200000}
        capitalSummary={{
          total_modal_disetor: 1000000,
          cash_balance: 200000,
          net_asset_value: 900000,
          overall_return: { nominal: -100000, percent: -10 },
        }}
      />
    );

    expect(screen.getByText('Total Modal Disetor')).toBeInTheDocument();
    expect(screen.getByText('Sisa Cash')).toBeInTheDocument();
    expect(screen.getByText('Net Asset Value')).toBeInTheDocument();
    expect(screen.getByText('Overall Return (%)')).toBeInTheDocument();
  });
});
