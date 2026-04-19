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
  const benchmarkLabel = meta?.benchmark || 'IHSG';

  function formatIndexAsPercent(value) {
    const numericValue = Number(value ?? 100);
    return `${(numericValue - 100).toFixed(2)}%`;
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
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
            <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="#44403c" />
            <YAxis tickFormatter={formatIndexAsPercent} stroke="#44403c" />
            <Tooltip
              formatter={(value) => formatIndexAsPercent(value)}
              labelFormatter={(label) => `Tanggal: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio_index"
              name="Portfolio"
              stroke="#0f766e"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark_index"
              name={benchmarkLabel}
              stroke="#b45309"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
