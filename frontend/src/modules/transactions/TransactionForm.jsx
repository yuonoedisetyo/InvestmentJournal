import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { stockApi } from '../../services/api';

const transactionModes = [
  { value: 'TOPUP', label: 'Topup' },
  { value: 'WITHDRAW', label: 'Withdraw' },
  { value: 'BUY', label: 'Beli Saham' },
  { value: 'SELL', label: 'Jual Saham' },
  { value: 'DIVIDEND', label: 'Dividen Manual' },
];

const modeOptions = [
  { value: 'single', label: 'Input Satuan' },
  { value: 'bulk', label: 'Upload Excel' },
];

const spreadsheetColumnHints = ['type', 'transaction_date', 'stock_code', 'lot', 'price', 'fee', 'amount', 'notes'];
const spreadsheetTemplateRows = [
  spreadsheetColumnHints,
  ['BUY', '29/03/2026', 'BBCA', 2, 9000, 1000, '', 'Beli saham BBCA'],
  ['TOPUP', '29/03/2026', '', '', '', '', 500000, 'Modal awal'],
];

const spreadsheetHeaderAliases = {
  type: 'type',
  jenis: 'type',
  jenis_transaksi: 'type',
  transaction_type: 'type',
  transaction_date: 'transaction_date',
  tanggal: 'transaction_date',
  date: 'transaction_date',
  stock_code: 'stock_code',
  kode_saham: 'stock_code',
  kode: 'stock_code',
  saham: 'stock_code',
  lot: 'lot',
  lots: 'lot',
  price: 'price',
  harga: 'price',
  fee: 'fee',
  biaya: 'fee',
  amount: 'amount',
  nominal: 'amount',
  jumlah: 'amount',
  notes: 'notes',
  catatan: 'notes',
  note: 'notes',
};

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

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeTransactionType(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  const aliases = {
    BELI: 'BUY',
    BUY: 'BUY',
    JUAL: 'SELL',
    SELL: 'SELL',
    TOPUP: 'TOPUP',
    DEPOSIT: 'TOPUP',
    WITHDRAW: 'WITHDRAW',
    TARIK: 'WITHDRAW',
    DIVIDEND: 'DIVIDEND',
    DIVIDEN: 'DIVIDEND',
  };

  return aliases[normalized] || normalized;
}

function normalizeSpreadsheetDate(value, fallbackDate) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value ?? '').trim();
  if (!text) {
    return fallbackDate;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return text;
}

function normalizeNumberValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  let normalized = raw.replace(/\s+/g, '');

  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    const parts = normalized.split(',');
    normalized = parts.length === 2 && parts[1].length <= 4
      ? `${parts[0].replace(/\./g, '')}.${parts[1]}`
      : normalized.replace(/,/g, '');
  }

  normalized = normalized.replace(/[^0-9.-]/g, '');

  if (!normalized || Number.isNaN(Number(normalized))) {
    return '';
  }

  return Number(normalized);
}

function normalizeSpreadsheetRow(rawRow, index, fallbackDate) {
  const mapped = {};

  Object.entries(rawRow ?? {}).forEach(([header, value]) => {
    const normalizedHeader = normalizeHeader(header);
    const targetKey = spreadsheetHeaderAliases[normalizedHeader];
    if (targetKey) {
      mapped[targetKey] = value;
    }
  });

  return {
    rowNumber: index + 2,
    type: normalizeTransactionType(mapped.type),
    transaction_date: normalizeSpreadsheetDate(mapped.transaction_date, fallbackDate),
    stock_code: String(mapped.stock_code ?? '').trim().toUpperCase(),
    lot: normalizeNumberValue(mapped.lot),
    price: normalizeNumberValue(mapped.price),
    fee: normalizeNumberValue(mapped.fee ?? 0),
    amount: normalizeNumberValue(mapped.amount),
    notes: String(mapped.notes ?? '').trim(),
  };
}

function validateBulkRow(row) {
  const errors = [];
  const isStockTransaction = ['BUY', 'SELL'].includes(row.type);
  const needsStockCode = ['BUY', 'SELL', 'DIVIDEND'].includes(row.type);
  const needsAmount = ['TOPUP', 'WITHDRAW', 'DIVIDEND'].includes(row.type);

  if (!transactionModes.some((mode) => mode.value === row.type)) {
    errors.push('Jenis transaksi tidak dikenali.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.transaction_date ?? ''))) {
    errors.push('Tanggal harus berformat dd/mm/yyyy.');
  }

  if (needsStockCode && !row.stock_code) {
    errors.push('Kode saham wajib diisi.');
  }

  if (isStockTransaction && (!row.lot || row.lot <= 0)) {
    errors.push('Lot wajib lebih dari 0.');
  }

  if (isStockTransaction && (!row.price || row.price <= 0)) {
    errors.push('Harga wajib lebih dari 0.');
  }

  if (needsAmount && (!row.amount || row.amount <= 0)) {
    errors.push('Nominal wajib lebih dari 0.');
  }

  return errors;
}

function createBulkSummary(rows) {
  const invalidRows = rows.filter((row) => row.errors.length > 0);
  return {
    total: rows.length,
    valid: rows.length - invalidRows.length,
    invalid: invalidRows.length,
  };
}

export default function TransactionForm({ portfolioId, onSubmit, onBulkComplete }) {
  const [entryMode, setEntryMode] = useState('single');
  const [form, setForm] = useState(createInitialForm);
  const [stockOptions, setStockOptions] = useState([]);
  const [submitFeedback, setSubmitFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState({ type: '', message: '' });
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const isStockTransaction = useMemo(() => ['BUY', 'SELL'].includes(form.type), [form.type]);
  const needsStockCode = useMemo(() => ['BUY', 'SELL', 'DIVIDEND'].includes(form.type), [form.type]);
  const isCashTransaction = useMemo(() => ['TOPUP', 'WITHDRAW', 'DIVIDEND'].includes(form.type), [form.type]);
  const bulkSummary = useMemo(() => createBulkSummary(bulkRows), [bulkRows]);

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
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBulkFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBulkFeedback({ type: '', message: '' });

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false,
      });

      if (!rows.length) {
        setBulkRows([]);
        setBulkFileName(file.name);
        setBulkFeedback({
          type: 'error',
          message: 'File Excel kosong atau tidak memiliki baris data.',
        });
        return;
      }

      const normalizedRows = rows.map((row, index) => {
        const normalized = normalizeSpreadsheetRow(row, index, form.transaction_date);
        return {
          ...normalized,
          errors: validateBulkRow(normalized),
        };
      });

      setBulkRows(normalizedRows);
      setBulkFileName(file.name);
      setBulkFeedback({
        type: 'success',
        message: `File ${file.name} berhasil dibaca. ${normalizedRows.length} baris ditemukan.`,
      });
    } catch {
      setBulkRows([]);
      setBulkFileName('');
      setBulkFeedback({
        type: 'error',
        message: 'File Excel gagal dibaca. Pastikan format .xlsx, .xls, atau .csv valid.',
      });
    } finally {
      event.target.value = '';
    }
  }

  async function submitBulk(event) {
    event.preventDefault();

    if (!portfolioId) {
      setBulkFeedback({
        type: 'error',
        message: 'Pilih portfolio dulu sebelum upload transaksi bulk.',
      });
      return;
    }

    if (!bulkRows.length) {
      setBulkFeedback({
        type: 'error',
        message: 'Upload file Excel dulu sebelum submit bulk.',
      });
      return;
    }

    if (bulkRows.some((row) => row.errors.length > 0)) {
      setBulkFeedback({
        type: 'error',
        message: 'Masih ada baris yang invalid. Perbaiki file Excel lalu upload ulang.',
      });
      return;
    }

    setBulkFeedback({ type: '', message: '' });
    setIsBulkSubmitting(true);

    let successCount = 0;
    const failures = [];

    try {
      for (const row of bulkRows) {
        try {
          await onSubmit({
            ...row,
            portfolio_id: portfolioId,
            fee: Number(row.fee ?? 0),
            __skipRefresh: true,
            __skipNotice: true,
          });
          successCount += 1;
        } catch (error) {
          failures.push(`Baris ${row.rowNumber}: ${error?.message || 'Gagal diproses.'}`);
        }
      }

      if (successCount > 0) {
        await onBulkComplete?.(portfolioId);
      }

      if (failures.length > 0) {
        setBulkFeedback({
          type: 'error',
          message: `Bulk upload selesai dengan ${successCount} berhasil dan ${failures.length} gagal. ${failures[0]}`,
        });
        return;
      }

      setBulkFeedback({
        type: 'success',
        message: `${successCount} transaksi berhasil diimport dari file Excel.`,
      });
      setBulkRows([]);
      setBulkFileName('');
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  function downloadTemplate() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(spreadsheetTemplateRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'template-transaksi-bulk.xlsx');
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Input Transaksi</h2>
      </div>

      {/* <label className="full-width">
        Mode Input
        <select value={entryMode} onChange={(event) => setEntryMode(event.target.value)}>
          {modeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label> */}

      {entryMode === 'single' ? (
        <>
          {submitFeedback.message ? (
            <div className={`notice ${submitFeedback.type === 'error' ? 'notice-error' : ''}`}>{submitFeedback.message}</div>
          ) : null}
          <form className="transaction-form" onSubmit={submit}>
            <label>
              Jenis Transaksi
              <select name="type" value={form.type} onChange={handleChange}>
                <option key="" value="">
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
        </>
      ) : (
        <>
          {bulkFeedback.message ? (
            <div className={`notice ${bulkFeedback.type === 'error' ? 'notice-error' : ''}`}>{bulkFeedback.message}</div>
          ) : null}
          <form className="transaction-form" onSubmit={submitBulk}>
            <button type="button" className="table-btn table-btn-muted" onClick={downloadTemplate}>
              Download Template Excel
            </button>

            <label className="full-width">
              Upload File Excel
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFileChange} />
            </label>

            <div className="notice">
              Kolom yang didukung: <strong>{spreadsheetColumnHints.join(', ')}</strong>.
              Tipe transaksi yang didukung: BUY, SELL, TOPUP, WITHDRAW, DIVIDEND. Isi kolom
              <strong> transaction_date</strong> dengan format <strong>dd/mm/yyyy</strong>, contoh <strong>29/03/2026</strong>.
            </div>

            {bulkFileName ? (
              <div className="notice">
                File aktif: <strong>{bulkFileName}</strong>
              </div>
            ) : null}

            {bulkRows.length ? (
              <>
                <div className="notice">
                  Preview {bulkSummary.total} baris. Valid: {bulkSummary.valid}. Invalid: {bulkSummary.invalid}.
                </div>
                <div className="table-card">
                  <table className="journal-table">
                    <thead>
                      <tr>
                        <th>Baris</th>
                        <th>Tipe</th>
                        <th>Tanggal</th>
                        <th>Kode</th>
                        <th>Lot</th>
                        <th>Harga</th>
                        <th>Fee</th>
                        <th>Nominal</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.slice(0, 8).map((row) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>{row.type || '-'}</td>
                          <td>{row.transaction_date || '-'}</td>
                          <td>{row.stock_code || '-'}</td>
                          <td>{row.lot || '-'}</td>
                          <td>{row.price || '-'}</td>
                          <td>{row.fee ?? '-'}</td>
                          <td>{row.amount || '-'}</td>
                          <td>{row.errors.length ? row.errors[0] : 'Siap diproses'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkRows.length > 8 ? (
                  <div className="notice">Preview dibatasi 8 baris pertama. Semua baris tetap akan diproses saat submit.</div>
                ) : null}
              </>
            ) : null}

            <button type="submit" className="submit-btn" disabled={isBulkSubmitting}>
              {isBulkSubmitting ? 'Mengimport...' : 'Import Transaksi Excel'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
