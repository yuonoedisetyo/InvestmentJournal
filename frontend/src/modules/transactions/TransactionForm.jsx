import { useEffect, useMemo, useState } from 'react';
import { stockApi } from '../../services/api';

const transactionModes = [
  { value: 'TOPUP', label: 'Topup' },
  { value: 'WITHDRAW', label: 'Withdraw' },
  { value: 'BUY', label: 'Beli Saham' },
  { value: 'SELL', label: 'Jual Saham' },
  { value: 'DIVIDEND', label: 'Dividen Manual' },
];

export default function TransactionForm({ portfolioId, onSubmit }) {
  const [form, setForm] = useState({
    type: '',
    stock_code: '',
    lot: '',
    price: '',
    fee: '0',
    amount: '',
    notes: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });
  const [stockOptions, setStockOptions] = useState([]);

  const isStockTransaction = useMemo(() => ['BUY', 'SELL'].includes(form.type), [form.type]);
  const needsStockCode = useMemo(() => ['BUY', 'SELL', 'DIVIDEND'].includes(form.type), [form.type]);
  const isCashTransaction = useMemo(() => ['TOPUP', 'WITHDRAW', 'DIVIDEND'].includes(form.type), [form.type]);

  useEffect(() => {
    if (!needsStockCode) {
      setStockOptions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const q = String(form.stock_code ?? '').trim();
        const data = await stockApi.listMasterStocks({ q, limit: 10 });
        if (!cancelled) {
          setStockOptions(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setStockOptions([]);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [needsStockCode, form.stock_code]);

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === 'stock_code') {
      setForm((prev) => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      ...form,
      portfolio_id: portfolioId,
      stock_code: String(form.stock_code || '').trim().toUpperCase(),
      lot: Number(form.lot),
      price: Number(form.price),
      fee: Number(form.fee),
      amount: Number(form.amount),
    });

    setForm((prev) => ({
      ...prev,
      notes: '',
    }));
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Input Transaksi</h2>
      </div>
      <form className="transaction-form" onSubmit={submit}>
        <label>
          Jenis Transaksi
          <select name="type" value={form.type} onChange={handleChange}>
            <option key={""} value={""}>
                --Pilih--
              </option>
            {transactionModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tanggal
          <input type="date" name="transaction_date" value={form.transaction_date} onChange={handleChange} required />
        </label>

        {needsStockCode ? (
          <label>
            Kode Saham
            <input
              type="text"
              name="stock_code"
              value={form.stock_code}
              onChange={handleChange}
              list="stock-code-options"
              autoComplete="off"
              required
            />
            <datalist id="stock-code-options">
              {stockOptions.map((item) => (
                <option key={item.stock_code} value={item.stock_code}>
                  {item.stock_name}
                </option>
              ))}
            </datalist>
          </label>
        ) : null}

        {isStockTransaction ? (
          <>
            <label>
              Lot
              <input type="number" name="lot" min="1" value={form.lot} onChange={handleChange} required />
            </label>
            <label>
              Harga
              <input type="number" name="price" min="0.0001" step="0.0001" value={form.price} onChange={handleChange} required />
            </label>
            <label>
              Fee
              <input type="number" name="fee" min="0" value={form.fee} onChange={handleChange} />
            </label>
          </>
        ) : null}

        {isCashTransaction ? (
          <label>
            Nominal
            <input type="number" name="amount" min="1" value={form.amount} onChange={handleChange} required />
          </label>
        ) : null}

        <label className="full-width">
          Catatan
          <input type="text" name="notes" value={form.notes} onChange={handleChange} placeholder="Opsional" />
        </label>

        <button type="submit" className="submit-btn">
          Simpan Transaksi
        </button>
      </form>
    </section>
  );
}
