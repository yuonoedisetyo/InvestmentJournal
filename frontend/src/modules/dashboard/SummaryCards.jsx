import StatCard from '../../components/StatCard';
import { formatIDR, formatPercent } from '../../utils/format';

export default function SummaryCards({ summary, cashBalance = 0, capitalSummary = null }) {
  const totalModalDisetor = Number(capitalSummary?.total_modal_disetor ?? 0);
  const totalTopup = Number(capitalSummary?.total_topup ?? 0);
  const totalWithdraw = Number(capitalSummary?.total_withdraw ?? 0);
  const cashBalanceSummary = Number(capitalSummary?.cash_balance ?? cashBalance ?? 0);
  const netAssetValue = Number(capitalSummary?.net_asset_value ?? summary.marketValue + cashBalanceSummary);
  const overallReturnNominal = Number(capitalSummary?.overall_return?.nominal ?? 0);
  const overallReturnPercent = Number(capitalSummary?.overall_return?.percent ?? 0);
  const cashBalancePercent = netAssetValue > 0 ? (cashBalanceSummary / netAssetValue) * 100 : 0;

  return (
    <section className="summary-grid">
      {/* <StatCard label="Invested" value={formatIDR(summary.invested)} accent="#0f766e" />
      <StatCard label="Market Value" value={formatIDR(summary.marketValue)} accent="#0c4a6e" />
      <StatCard
        label="Unrealized P/L"
        value={formatIDR(summary.unrealized)}
        accent={summary.unrealized >= 0 ? '#166534' : '#991b1b'}
      />
      <StatCard
        label="Total Return"
        value={formatPercent(summary.pnlPercent)}
        accent={summary.pnlPercent >= 0 ? '#854d0e' : '#9f1239'}
      /> */}
      <StatCard label="Total Modal Disetor" value={formatIDR(totalModalDisetor)} accent="#155e75" />
      <StatCard
        label="Sisa Cash"
        value={`${formatIDR(cashBalanceSummary)} (${formatPercent(cashBalancePercent)})`}
        accent="#0369a1"
      />

      {/* <StatCard label="Total Topup" value={formatIDR(totalTopup)} accent="#166534" />
      <StatCard label="Total Withdraw" value={formatIDR(totalWithdraw)} accent="#991b1b" /> */}
      <StatCard label="Net Asset Value" value={formatIDR(netAssetValue)} accent="#1d4ed8" />
      <StatCard
        label="Overall Return"
        value={`${formatIDR(overallReturnNominal)} (${formatPercent(overallReturnPercent)})`}
        accent={overallReturnNominal >= 0 ? '#166534' : '#991b1b'}
      />
    </section>
  );
}
