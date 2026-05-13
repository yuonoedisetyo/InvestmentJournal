import { render, screen } from '@testing-library/react';
import PerformanceChart from './PerformanceChart';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: ({ tickFormatter }) => (
    <div>
      <span>{tickFormatter(-0.5)}</span>
      <span>{tickFormatter(0)}</span>
      <span>{tickFormatter(1.25)}</span>
    </div>
  ),
  Tooltip: () => <div />,
  Legend: () => <div>Legend</div>,
  Line: ({ name }) => <div>{name}</div>,
}));

describe('PerformanceChart', () => {
  it('renders chart heading and line labels', () => {
    render(
      <PerformanceChart
        data={{
          meta: { benchmark: 'IHSG' },
          series: [
            { date: '2026-03-21', portfolio_index: 100, benchmark_index: 100 },
            { date: '2026-03-22', portfolio_index: 102.5, benchmark_index: 99.75 },
          ],
        }}
      />
    );

    expect(screen.getByText('Perkembangan Nilai Investasi vs IHSG')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('IHSG')).toBeInTheDocument();
    expect(screen.getByText('-0.50%')).toBeInTheDocument();
    expect(screen.getByText('0.00%')).toBeInTheDocument();
    expect(screen.getByText('1.25%')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Terakhir')).toBeInTheDocument();
    expect(screen.getByText('IHSG Terakhir')).toBeInTheDocument();
    expect(screen.getByText('2.50%')).toBeInTheDocument();
    expect(screen.getByText('-0.25%')).toBeInTheDocument();
  });
});
