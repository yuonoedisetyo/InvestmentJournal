import { useEffect, useMemo, useState } from 'react';
import { stockApi } from '../../services/api';

const transactionModes = [
  { value: 'TOPUP', label: 'Topup' },
  { value: 'WITHDRAW', label: 'Withdraw' },
  { value: 'BUY', label: 'Beli Saham' },
  { value: 'SELL', label: 'Jual Saham' },
  { value: 'DIVIDEND', label: 'Dividen Manual' },
];

function formatThousandSeparator(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

function normalizeAmountValue(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function createInitialForm() {
  return {
    type: '',
    stock_code: '',
    lot: '',
    price: '',
    fee: '0',
    amount: '',
    notes: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  };
}

export default function TransactionForm({ portfolioId, onSubmit }) {
  const [form, setForm] = useState(createInitialForm);
  const [stockOptions, setStockOptions] = useState([]);
  const [submitFeedback, setSubmitFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (name === 'amount') {
      setForm((prev) => ({ ...prev, [name]: normalizeAmountValue(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    setSubmitFeedback({ type: '', message: '' });
    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        ...form,
        portfolio_id: portfolioId,
        stock_code: String(form.stock_code || '').trim().toUpperCase(),
        lot: Number(form.lot),
        price: Number(form.price),
        fee: Number(form.fee),
        amount: Number(form.amount),
      });

      setSubmitFeedback({
        type: 'success',
        message: result?.message || 'Transaksi berhasil disimpan.',
      });
      setForm(createInitialForm());
    } catch (error) {
      setSubmitFeedback({
        type: 'error',
        message: error?.message || 'Transaksi gagal disimpan.',
      });
      setForm(createInitialForm());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Input Transaksi</h2>
      </div>
      {submitFeedback.message ? (
        <div className={`notice ${submitFeedback.type === 'error' ? 'notice-error' : ''}`}>{submitFeedback.message}</div>
      ) : null}
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
            <input
              type="text"
              name="amount"
              inputMode="numeric"
              pattern="[0-9.]*"
              placeholder="Contoh: 500.000"
              value={formatThousandSeparator(form.amount)}
              onChange={handleChange}
              required
            />
          </label>
        ) : null}

        <label className="full-width">
          Catatan
          <input type="text" name="notes" value={form.notes} onChange={handleChange} placeholder="Opsional" />
        </label>

        <button type="submit" className="submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </form>
    </section>
  );
}
