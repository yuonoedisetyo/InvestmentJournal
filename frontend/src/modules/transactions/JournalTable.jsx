import { useEffect, useState } from 'react';
import { formatIDR } from '../../utils/format';

const PAGE_SIZE = 10;

export default function JournalTable({ data, onEdit, onDelete, onOpenTransactionForm }) {
  const [editingKey, setEditingKey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [stockCodeFilter, setStockCodeFilter] = useState('');
  const [form, setForm] = useState({
    transaction_date: '',
    lot: 0,
    price: 0,
    amount: 0,
    fee: 0,
    notes: '',
  });

  const typeOptions = Array.from(new Set(data.map((item) => item.type).filter(Boolean)));
  const normalizedStockCodeFilter = stockCodeFilter.trim().toUpperCase();
  const filteredData = data.filter((item) => {
    const matchesType = typeFilter ? item.type === typeFilter : true;
    const matchesStockCode = normalizedStockCodeFilter
      ? String(item.stock_code ?? '').toUpperCase().includes(normalizedStockCodeFilter)
      : true;
    return matchesType && matchesStockCode;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleRows = filteredData.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, normalizedStockCodeFilter]);

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
        <div className="panel-head-actions">
          <button type="button" className="table-btn" onClick={onOpenTransactionForm}>
            Input Transaksi
          </button>
        </div>
      </div>
      {data.length > 0 ? (
        <div className="panel-head">
          <label>
            Filter Jenis
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">Semua</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Filter Stock Code
            <input
              type="text"
              value={stockCodeFilter}
              onChange={(event) => setStockCodeFilter(event.target.value.toUpperCase())}
              placeholder="Contoh: BBCA"
            />
          </label>
        </div>
      ) : null}
      {filteredData.length > 0 ? (
        <div className="panel-head">
          <span>
            Menampilkan {startIndex + 1}-{Math.min(startIndex + visibleRows.length, filteredData.length)} dari {filteredData.length} transaksi
          </span>
          {totalPages > 1 ? (
            <div className="journal-actions">
              <button
                type="button"
                className="table-btn table-btn-muted"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
              >
                Sebelumnya
              </button>
              <span>
                Halaman {safePage} / {totalPages}
              </span>
              <button
                type="button"
                className="table-btn table-btn-muted"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
              >
                Berikutnya
              </button>
            </div>
          ) : null}
        </div>
      ) : data.length > 0 ? (
        <div className="notice notice-error">Tidak ada transaksi yang cocok dengan filter saat ini.</div>
      ) : null}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th>Kode</th>
              <th>Lot</th>
              <th>Harga per Saham</th>
              <th>Total Nominal</th>
              <th>Fee</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="9">{data.length === 0 ? 'Belum ada transaksi.' : 'Tidak ada data yang cocok dengan filter.'}</td>
              </tr>
            ) : (
              visibleRows.map((item) => (
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
                      item.entry_type === 'STOCK' ? (
                        <input type="number" name="price" min="1" value={form.price} onChange={handleChange} />
                      ) : (
                        '-'
                      )
                    ) : (
                      item.entry_type === 'STOCK' ? formatIDR(item.price) : '-'
                    )}
                  </td>
                  <td>
                    {editingKey === item.row_key ? (
                      item.entry_type === 'CASH' || item.entry_type === 'DIVIDEND' ? (
                        <input type="number" name="amount" min="1" value={form.amount} onChange={handleChange} />
                      ) : (
                        formatIDR(item.amount || 0)
                      )
                    ) : (
                      formatIDR(item.amount || 0)
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
