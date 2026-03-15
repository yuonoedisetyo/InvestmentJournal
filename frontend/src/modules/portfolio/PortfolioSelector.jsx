import { useState } from 'react';

export default function PortfolioSelector({
  portfolios,
  selectedPortfolioId,
  onChange,
  onCreate,
  creating = false,
}) {
  const [form, setForm] = useState({
    name: '',
    currency: 'IDR',
    initial_capital: '',
    is_active: true,
  });

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    await onCreate({
      name: form.name.trim(),
      currency: form.currency,
      initial_capital: form.initial_capital ? Number(form.initial_capital) : 0,
      is_active: form.is_active,
    });

    setForm((prev) => ({
      ...prev,
      name: '',
      initial_capital: '',
      is_active: true,
    }));
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Portfolio Aktif</h2>
      </div>
      <div className="portfolio-list">
        {portfolios.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`portfolio-chip ${item.id === selectedPortfolioId ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <span>{item.name}</span>
            {item.is_active ? <small>Active</small> : <small>Inactive</small>}
          </button>
        ))}
      </div>
      <form className="portfolio-create-form" onSubmit={handleSubmit}>
        <label>
          Nama Portfolio
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Contoh: Growth Portfolio"
            required
          />
        </label>
        <label>
          Mata Uang
          <select name="currency" value={form.currency} onChange={handleChange}>
            <option value="IDR">IDR</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label>
          Modal Awal
          <input
            type="number"
            name="initial_capital"
            value={form.initial_capital}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="0"
          />
        </label>
        <label className="portfolio-check">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
          Jadikan portfolio aktif
        </label>
        <button type="submit" className="submit-btn" disabled={creating}>
          {creating ? 'Menyimpan...' : 'Buat Portfolio'}
        </button>
      </form>
    </section>
  );
}
