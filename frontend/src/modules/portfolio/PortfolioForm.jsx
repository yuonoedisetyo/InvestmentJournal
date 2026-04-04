import { useState } from 'react';

function createInitialForm() {
  return {
    name: '',
    currency: 'IDR',
  };
}

export default function PortfolioForm({ onSubmit, creating = false }) {
  const [form, setForm] = useState(createInitialForm);

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

    await onSubmit({
      name: form.name.trim(),
      currency: form.currency,
      initial_capital: 0,
      is_active: true,
    });

    setForm((prev) => ({
      ...prev,
      name: '',
    }));
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Buat Portfolio</h2>
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
        <button type="submit" className="submit-btn" disabled={creating}>
          {creating ? 'Menyimpan...' : 'Buat Portfolio'}
        </button>
      </form>
    </section>
  );
}
