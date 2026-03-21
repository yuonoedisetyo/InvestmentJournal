# Investment Journal Backend (Laravel + MySQL)

Backend blueprint for an investment journal with:

- Multi-portfolio per user
- Buy/Sell engine using weighted average price
- Manual dividend input
- Selective stock price sync (active portfolio holdings only)
- Shared-hosting friendly operation (no Redis, no queue)
- Financial precision with `DECIMAL` + BCMath (no float)
- Clean architecture (`Controller -> Service -> Repository`)

## Structure

- `backend/app/Http/Controllers` API controllers
- `backend/app/Services` business logic
- `backend/app/Repositories` data access
- `backend/database/migrations` schema
- `backend/app/Console/Commands/SyncActivePortfolioPrices.php` sync command

## Core APIs (`routes/api.php`)

- `GET /api/portfolios`
- `POST /api/portfolios`
- `PATCH /api/portfolios/{id}/activate`
- `POST /api/transactions/buy`
- `POST /api/transactions/sell`
- `POST /api/dividends/manual`
- `POST /api/prices/sync-active`

## Weighted Average Engine

- Buy:
  - `shares = lot * 100`
  - `gross = shares * price`
  - `net = gross + fee`
  - `new_invested = old_invested + net`
  - `new_avg = new_invested / new_total_shares`
- Sell:
  - `gross = shares * price`
  - `net = gross - fee`
  - `cost_basis = avg_price * sold_shares`
  - `realized_pnl = net - cost_basis`
  - Update position shares, invested amount, and realized pnl


# Investment Journal

Panduan singkat untuk menjalankan project ini dari nol.

## Kebutuhan

- Docker Desktop aktif
- Node.js 18+ dan npm

## 1. Jalankan Backend

Dari root project:

```bash
docker compose up --build -d
docker compose exec app php artisan migrate
```

Backend yang aktif:

- API Laravel: `http://localhost:8000`
- phpMyAdmin: `http://localhost:8080`
- MySQL host port: `3307`

## 2. Jalankan Frontend

Buka terminal baru:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend akan jalan di:

```text
http://localhost:5173
```

Isi default [frontend/.env.example](/Users/user/Documents/project/Codex/InvestmentJournal/frontend/.env.example):

```env
VITE_API_BASE_URL=http://localhost:8000
```

## 3. Pakai Aplikasi

1. Buka `http://localhost:5173`
2. Register akun baru dengan:
   - Nama
   - email atau no HP
   - password
3. Login
4. Setelah login, baru dashboard bisa diakses

## 4. Command Penting

Lihat status container:

```bash
docker compose ps
```

Lihat log backend:

```bash
docker compose logs -f app
```

Restart backend:

```bash
docker compose restart app
```

Bersihkan cache Laravel:

```bash
docker compose exec app php artisan optimize:clear
```

## 5. Akses Database

Buka:

```text
http://localhost:8080
```

Login phpMyAdmin:

- Server: `mysql`
- Username: `root`
- Password: `root`

## 6. Jika Mulai Ulang dari Nol

```bash
docker compose down
docker compose up --build -d
docker compose exec app php artisan migrate
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Struktur Singkat

- [backend](/Users/user/Documents/project/Codex/InvestmentJournal/backend): Laravel API + MySQL
- [frontend](/Users/user/Documents/project/Codex/InvestmentJournal/frontend): React + Vite
