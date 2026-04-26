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
import { formatCompactDate, formatIDR } from '../../utils/format';

export default function CapitalComparisonChart({ data, capitalSummary = null, summary }) {
  const series = Array.isArray(data) ? data : Array.isArray(data?.series) ? data.series : [];
  const currentModalDisetor =
    Number(capitalSummary?.total_modal_disetor ?? series.at(-1)?.total_modal_disetor ?? 0);
  const currentAsetValue =
    Number(capitalSummary?.net_asset_value ?? series.at(-1)?.total_asset_value ?? summary.marketValue ?? 0);
  const difference = currentAsetValue - currentModalDisetor;
  const chartData = series.length
    ? series.map((item) => ({
        date: item.date,
        total_modal_disetor: Number(item.total_modal_disetor ?? 0),
        total_asset_value: Number(item.total_asset_value ?? item.portfolio_nav ?? 0),
      }))
    : [
        {
          date: 'Hari ini',
          total_modal_disetor: currentModalDisetor,
          total_asset_value: currentAsetValue,
        },
      ];
  const largestYAxisValue = chartData.reduce(
    (largest, item) =>
      Math.max(
        largest,
        Math.abs(Number(item.total_modal_disetor ?? 0)),
        Math.abs(Number(item.total_asset_value ?? 0))
      ),
    0
  );
  const yAxisWidth = Math.min(150, Math.max(80, String(Math.round(largestYAxisValue)).length * 8 + 28));

  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <h2>Pertumbuhan Modal vs Aset</h2>
        <p>
          Profit/Loss: {formatIDR(difference)}
        </p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
            <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="#44403c" />
            <YAxis stroke="#44403c" width={yAxisWidth} tickMargin={8} />
            <Tooltip
              formatter={(value) => formatIDR(Number(value ?? 0))}
              labelFormatter={(label) => `Tanggal: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total_modal_disetor"
              name="Total Modal Disetor"
              stroke="#155e75"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="total_asset_value"
              name="Total Aset Value"
              stroke="#1d4ed8"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
