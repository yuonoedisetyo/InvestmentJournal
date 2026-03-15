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
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <h2>Perkembangan Nilai Investasi vs IHSG</h2>
        <p>Index dasar 100 (normalisasi performa)</p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
            <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="#44403c" />
            <YAxis stroke="#44403c" />
            <Tooltip
              formatter={(value) => Number(value).toFixed(2)}
              labelFormatter={(label) => `Tanggal: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke="#0f766e" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="ihsg" name="IHSG" stroke="#b45309" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
