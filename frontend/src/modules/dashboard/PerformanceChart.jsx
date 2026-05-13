import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactDate } from '../../utils/format';

export default function PerformanceChart({ data }) {
  const meta = Array.isArray(data) ? null : data?.meta ?? null;
  const rawSeries = Array.isArray(data) ? data : Array.isArray(data?.series) ? data.series : [];
  const cutoffDate = meta?.effective_performance_cutoff_date || meta?.performance_cutoff_date || null;
  const series = cutoffDate
    ? rawSeries.filter((item) => String(item?.date ?? '') >= cutoffDate)
    : rawSeries;
  const chartData = series.map((item) => ({
    ...item,
    portfolio_return: Number(item?.portfolio_index ?? 100) - 100,
    benchmark_return: Number(item?.benchmark_index ?? 100) - 100,
  }));
  const latestData = chartData.at(-1) ?? {
    portfolio_return: 0,
    benchmark_return: 0,
  };
  const benchmarkLabel = meta?.benchmark || 'IHSG';

  function formatPercentValue(value) {
    const returnValue = Number(value ?? 0);
    const sign = returnValue < 0 ? '-' : '';
    return `${sign}${Math.abs(returnValue).toFixed(2)}%`;
  }

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <h2>Perkembangan Nilai Investasi vs {benchmarkLabel}</h2>
        <p>
          Ditampilkan sebagai return kumulatif (%) dari titik awal
          {cutoffDate ? ` sejak ${cutoffDate}` : ''}
        </p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
            <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="#44403c" />
            <YAxis tickFormatter={formatPercentValue} stroke="#44403c" width={72} tickMargin={8} />
            <Tooltip
              formatter={(value) => formatPercentValue(value)}
              labelFormatter={(label) => `Tanggal: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio_return"
              name="Portfolio"
              stroke="#0f766e"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark_return"
              name={benchmarkLabel}
              stroke="#b45309"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-latest-summary" aria-label="Return terakhir portfolio dan benchmark">
        <div>
          <span>Portfolio Terakhir</span>
          <strong>{formatPercentValue(latestData.portfolio_return)}</strong>
        </div>
        <div>
          <span>{benchmarkLabel} Terakhir</span>
          <strong>{formatPercentValue(latestData.benchmark_return)}</strong>
        </div>
      </div>
    </section>
  );
}
