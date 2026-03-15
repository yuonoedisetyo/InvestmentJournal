import { useState } from 'react';
import { formatIDR, formatPercent } from '../../utils/format';
import StatCard from '../../components/StatCard';

export default function PositionsTable({ positions, onUpdateLastPrice, summary, onSyncSpreadsheet, syncing = false }) {
  const [editingCode, setEditingCode] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const sortedPositions = [...positions].sort((a, b) => Number(b.market_value ?? 0) - Number(a.market_value ?? 0));

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
          <button type="button" className="table-btn" onClick={onSyncSpreadsheet} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Harga'}
          </button>
        </div>
      </div>
      <section className="summary-grid">

      <StatCard label="Invested" value={formatIDR(summary.invested)} accent="#0f766e" />
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
      /> 
      </section>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Lot</th>
              <th>Avg Price</th>
              <th>Last Price</th>
              <th>Invested</th>
              <th>Market Value</th>
              <th>Unrealized P/L</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((item) => (
              <tr key={item.stock_code}>
                <td>{item.stock_code}</td>
                <td>{item.total_shares / 100}</td>
                <td>{formatIDR(item.average_price)}</td>
                <td>
                  {editingCode === item.stock_code ? (
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
                <td>{formatIDR(item.invested_amount)}</td>
                <td>{formatIDR(item.market_value)}</td>
                <td className={Number(item.unrealized_pnl) >= 0 ? 'profit' : 'loss'}>{formatIDR(item.unrealized_pnl)}</td>
                <td className="journal-actions">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
