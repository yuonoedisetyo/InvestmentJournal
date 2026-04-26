import { useMemo, useState } from 'react';
import { calculateDcf } from '../../../utils/dcf';

const defaultForm = {
  currentFcf: '1000000000000',
  growthRate: '10',
  discountRate: '14',
  terminalGrowthRate: '4',
  sharesOutstanding: '10000000000',
  cash: '500000000000',
  debt: '150000000000',
  marketPrice: '950',
};

function formatMoney(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function fieldLabel(label, helper) {
  return (
    <span>
      {label}
      <small>{helper}</small>
    </span>
  );
}

export default function DcfCalculator({ compact = false }) {
  const [form, setForm] = useState(defaultForm);

  const result = useMemo(() => {
    try {
      return {
        data: calculateDcf(form),
        error: '',
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Perhitungan DCF tidak valid.',
      };
    }
  }, [form]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  return (
    <section className={`dcf-calculator ${compact ? 'compact' : ''}`}>
      <div className="dcf-input-grid">
        <label>
          {fieldLabel('Current FCF', 'Nilai kas bebas saat ini')}
          <input name="currentFcf" value={form.currentFcf} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Growth Rate', '% per tahun')}
          <input name="growthRate" value={form.growthRate} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Discount Rate', '% per tahun')}
          <input name="discountRate" value={form.discountRate} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Terminal Growth', '% terminal')}
          <input name="terminalGrowthRate" value={form.terminalGrowthRate} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Shares Outstanding', 'Jumlah lembar saham')}
          <input name="sharesOutstanding" value={form.sharesOutstanding} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Cash', 'Kas dan setara kas')}
          <input name="cash" value={form.cash} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Debt', 'Total utang')}
          <input name="debt" value={form.debt} onChange={handleChange} />
        </label>
        <label>
          {fieldLabel('Market Price', 'Harga pasar saat ini')}
          <input name="marketPrice" value={form.marketPrice} onChange={handleChange} />
        </label>
      </div>

      {result.error ? <div className="notice notice-error">{result.error}</div> : null}

      {result.data ? (
        <div className="dcf-results">
          <div className="dcf-result-summary">
            <div className="public-stat">
              <span>Intrinsic Value / Share</span>
              <strong>{formatMoney(result.data.intrinsicValuePerShare)}</strong>
            </div>
            <div className="public-stat">
              <span>Status</span>
              <strong>{result.data.status}</strong>
            </div>
            <div className="public-stat">
              <span>Premium / Discount</span>
              <strong>{result.data.premiumDiscountPercent.toFixed(2)}%</strong>
            </div>
          </div>

          <div className="dcf-table-wrap">
            <table className="dcf-table">
              <thead>
                <tr>
                  <th>Tahun</th>
                  <th>FCF</th>
                  <th>PV FCF</th>
                </tr>
              </thead>
              <tbody>
                {result.data.projections.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td>{formatMoney(row.fcf)}</td>
                    <td>{formatMoney(row.pvFcf)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
