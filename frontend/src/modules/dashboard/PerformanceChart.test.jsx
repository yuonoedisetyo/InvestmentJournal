import { render, screen } from '@testing-library/react';
import PerformanceChart from './PerformanceChart';

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

describe('PerformanceChart', () => {
  it('renders chart heading and line labels', () => {
    render(<PerformanceChart data={[{ date: '2026-03-21', portfolio: 100, ihsg: 100 }]} />);

    expect(screen.getByText('Perkembangan Nilai Investasi vs IHSG')).toBeInTheDocument();
    expect(screen.getByText('Portfolio')).toBeInTheDocument();
    expect(screen.getByText('IHSG')).toBeInTheDocument();
  });
});
