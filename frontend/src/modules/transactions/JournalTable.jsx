import { useState } from 'react';
import { formatIDR } from '../../utils/format';

export default function JournalTable({ data, onEdit, onDelete }) {
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState({
    transaction_date: '',
    lot: 0,
    price: 0,
    amount: 0,
    fee: 0,
    notes: '',
  });

  function startEdit(item) {
    setEditingKey(item.row_key);
    setForm({
      transaction_date: item.transaction_date || '',
      lot: Number(item.lot || 0),
      price: Number(item.price || 0),
      amount: Number(item.amount || 0),
      fee: Number(item.fee || 0),
      notes: item.notes || '',
    });
  }

  function cancelEdit() {
    setEditingKey(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'notes' || name === 'transaction_date' ? value : Number(value),
    }));
  }

  async function saveEdit() {
    const current = data.find((item) => item.row_key === editingKey);
    if (!editingKey || !current) {
      return;
    }

    await onEdit(current, {
      transaction_date: form.transaction_date,
      lot: Number(form.lot),
      price: Number(form.price),
      amount: Number(form.amount),
      fee: Number(form.fee),
      notes: form.notes,
    });
    setEditingKey(null);
  }

  async function removeItem(item) {
    if (!window.confirm('Hapus transaksi ini?')) {
      return;
    }
    await onDelete(item);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Jurnal Transaksi</h2>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Kode</th>
              <th>Lot</th>
              <th>Harga/Nominal</th>
              <th>Fee</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="8">Belum ada transaksi.</td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.row_key}>
                  <td>
                    {editingKey === item.row_key ? (
                      <input type="date" name="transaction_date" value={form.transaction_date} onChange={handleChange} />
                    ) : (
                      item.transaction_date
                    )}
                  </td>
                  <td>{item.type}</td>
                  <td>{item.stock_code || '-'}</td>
                  <td>
                    {editingKey === item.row_key && item.entry_type === 'STOCK' ? (
                      <input type="number" name="lot" min="1" value={form.lot} onChange={handleChange} />
                    ) : (
                      item.lot || '-'
                    )}
                  </td>
                  <td>
                    {editingKey === item.row_key ? (
                      item.entry_type === 'CASH' || item.entry_type === 'DIVIDEND' ? (
                        <input type="number" name="amount" min="1" value={form.amount} onChange={handleChange} />
                      ) : (
                        <input type="number" name="price" min="1" value={form.price} onChange={handleChange} />
                      )
                    ) : (
                      formatIDR(item.amount || item.price || 0)
                    )}
                  </td>
                  <td>
                    {editingKey === item.row_key && item.entry_type === 'STOCK' ? (
                      <input type="number" name="fee" min="0" value={form.fee} onChange={handleChange} />
                    ) : (
                      formatIDR(item.fee || 0)
                    )}
                  </td>
                  <td>
                    {editingKey === item.row_key ? (
                      <input type="text" name="notes" value={form.notes} onChange={handleChange} />
                    ) : (
                      item.notes || '-'
                    )}
                  </td>
                  <td className="journal-actions">
                    {editingKey === item.row_key ? (
                      <>
                        <button type="button" className="table-btn" onClick={saveEdit}>
                          Simpan
                        </button>
                        <button type="button" className="table-btn table-btn-muted" onClick={cancelEdit}>
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="table-btn" onClick={() => startEdit(item)}>
                          Edit
                        </button>
                        <button type="button" className="table-btn table-btn-danger" onClick={() => removeItem(item)}>
                          Hapus
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
