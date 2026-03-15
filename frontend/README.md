# Frontend - React + Vite

## Run

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment

Create `.env` in `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Scope

- Input transaksi: topup, withdraw, beli, jual, dividen manual
- Ringkasan portfolio: total investasi, market value, unrealized/realized PnL
- Tabel posisi saham
- Grafik perbandingan performa portfolio vs IHSG

Note: saat backend endpoint analytics/cash belum ada, UI tetap bisa dipakai dengan state lokal mock.
