import { render, screen } from '@testing-library/react';
import CapitalComparisonChart from './CapitalComparisonChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div>Legend</div>,
  Line: ({ name }) => <div>{name}</div>,
}));

describe('CapitalComparisonChart', () => {
  it('renders growth comparison heading and line labels', () => {
    render(
      <CapitalComparisonChart
        data={{
          series: [
            { date: '2026-04-01', total_modal_disetor: 1000000, total_asset_value: 1020000 },
            { date: '2026-04-02', total_modal_disetor: 1200000, total_asset_value: 1235000 },
          ],
        }}
        summary={{ marketValue: 700000 }}
        capitalSummary={{
          total_modal_disetor: 1200000,
          net_asset_value: 1235000,
        }}
      />
    );

    expect(screen.getByText('Pertumbuhan Modal vs Aset')).toBeInTheDocument();
    expect(screen.getByText(/Selisih saat ini/)).toBeInTheDocument();
    expect(screen.getByText('Total Modal Disetor')).toBeInTheDocument();
    expect(screen.getByText('Total Aset Value')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
});
