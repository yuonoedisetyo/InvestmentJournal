import { useState } from 'react';
import { formatIDR, formatPercent } from '../../utils/format';
import StatCard from '../../components/StatCard';

export default function PositionsTable({
  positions,
  onUpdateLastPrice,
  summary,
  onSyncSpreadsheet,
  syncing = false,
  readOnly = false,
}) {
  const [editingCode, setEditingCode] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const sortedPositions = [...positions].sort((a, b) => Number(b.market_value ?? 0) - Number(a.market_value ?? 0));
  const latestSyncAt = positions
    .map((item) => item.last_sync_at)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  function formatSyncDateTime(value) {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getPortfolioShare(value, total) {
    const numericTotal = Number(total ?? 0);
    if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
      return 0;
    }

    return (Number(value ?? 0) / numericTotal) * 100;
  }

  function getUnrealizedPercent(item) {
    const investedAmount = Number(item.invested_amount ?? 0);
    if (!Number.isFinite(investedAmount) || investedAmount <= 0) {
      return 0;
    }

    return (Number(item.unrealized_pnl ?? 0) / investedAmount) * 100;
  }

  function getSummaryRatio(value, base) {
    const numericBase = Number(base ?? 0);
    if (!Number.isFinite(numericBase) || numericBase <= 0) {
      return 0;
    }

    return (Number(value ?? 0) / numericBase) * 100;
  }

  function startEdit(item) {
    setEditingCode(item.stock_code);
    setDraftPrice(String(item.last_price ?? ''));
  }

  function cancelEdit() {
    setEditingCode('');
    setDraftPrice('');
  }

  async function saveEdit(stockCode) {
    const numericPrice = Number(draftPrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return;
    }

    await onUpdateLastPrice(stockCode, numericPrice);
    cancelEdit();
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Posisi Saham</h2>
        <div className="panel-head-actions">
          <div>
            {!readOnly ? (
              <button type="button" className="table-btn" onClick={onSyncSpreadsheet} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync Harga'}
              </button>
            ) : null}
            <p>Terakhir sync harga: {formatSyncDateTime(latestSyncAt)}</p>
          </div>
        </div>
      </div>
      <section className="summary-grid">

      <StatCard
        label="Invested"
        value={`${formatIDR(summary.invested)} `}
        accent="#0f766e"
      />
      <StatCard
        label="Market Value"
        value={`${formatIDR(summary.marketValue)} `}
        accent="#0c4a6e"
      />
      <StatCard
        label="Unrealized P/L"
        value={`${formatIDR(summary.unrealized)} (${formatPercent(summary.pnlPercent)})`}
        accent={summary.unrealized >= 0 ? '#166534' : '#991b1b'}
      />
      </section>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode</th>
              <th>Market Value</th>
              <th>Unrealized P/L</th>
              <th>Lot</th>
              <th>Avg Price</th>
              <th>Last Price</th>
              <th>Invested</th>
              
              {/* <th>Aksi</th> */}
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((item, index) => (
              <tr key={item.stock_code}>
                <td>{index + 1}</td>
                <td>{item.stock_code}</td>
                <td>
                  {formatIDR(item.market_value)} ({formatPercent(getPortfolioShare(item.market_value, summary.marketValue))})
                </td>
                <td className={Number(item.unrealized_pnl) >= 0 ? 'profit' : 'loss'}>
                  {formatIDR(item.unrealized_pnl)} ({formatPercent(getUnrealizedPercent(item))})
                </td>
                <td>{item.total_shares / 100}</td>
                <td>{formatIDR(item.average_price)}</td>
                <td>
                  {!readOnly && editingCode === item.stock_code ? (
                    <input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value={draftPrice}
                      onChange={(event) => setDraftPrice(event.target.value)}
                    />
                  ) : (
                    formatIDR(item.last_price)
                  )}
                </td>
                <td>
                  {formatIDR(item.invested_amount)} ({formatPercent(getPortfolioShare(item.invested_amount, summary.invested))})
                </td>
               
                {/* <td className="journal-actions">
                  {editingCode === item.stock_code ? (
                    <>
                      <button type="button" className="table-btn" onClick={() => saveEdit(item.stock_code)}>
                        Simpan
                      </button>
                      <button type="button" className="table-btn table-btn-muted" onClick={cancelEdit}>
                        Batal
                      </button>
                    </>
                  ) : (
                    <button type="button" className="table-btn" onClick={() => startEdit(item)}>
                      Edit Last Price
                    </button>
                  )}
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
