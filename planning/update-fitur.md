# Planning Fitur Publik Web

## Tujuan

Membuat web publik yang bisa diakses tanpa login, dengan isi utama:

1. Artikel edukasi investasi.
2. Kalkulator valuasi DCF.
3. Tentang kami.
4. Daftar portfolio yang diset public.
5. Tombol login untuk masuk ke dashboard yang sudah ada.

Planning ini sengaja dibuat detail dan low-context supaya bisa dieksekusi model AI yang lebih murah dengan risiko improvisasi yang kecil.

## Asumsi Produk

1. Istilah "kalkulator premi" disamakan dengan kalkulator valuasi DCF yang menghasilkan:
   - intrinsic value per share
   - status premium atau discount terhadap harga pasar saat ini
2. Artikel fase 1 dibuat sebagai konten statis di frontend, bukan CMS.
3. Dashboard existing tetap dipakai dan tetap butuh login.
4. Public portfolio detail yang sudah ada di `/shared/portfolio/:shareToken` tetap dipertahankan.
5. Fokus implementasi hanya di `frontend/` dan `backend/`.

## Guardrails untuk Model AI Murah

1. Jangan sentuh folder `mobile/`.
2. Jangan sentuh folder `backend_custom/` dan `backend_blueprint/`.
3. Jangan edit `frontend/dist/`.
4. Jangan refactor besar-besaran dashboard lama jika tidak wajib.
5. Jangan tambah dependency baru kecuali benar-benar perlu.
6. Untuk routing fase ini, jangan pakai library router baru. Cukup pakai resolver `window.location.pathname` karena pola ini sudah dipakai untuk `/shared/portfolio/:shareToken`.
7. Kerjakan per tiket kecil. Jangan menggabungkan backend, artikel, DCF, dan dashboard dalam satu perubahan besar.

## Kondisi Repo Saat Ini

1. Frontend utama masih bertumpu pada `frontend/src/App.jsx`.
2. Halaman publik yang sudah ada baru portfolio share detail.
3. Backend sudah punya:
   - auth API
   - portfolio private
   - toggle `is_public`
   - endpoint `GET /api/public/portfolios/{shareToken}`
4. Backend belum punya endpoint list portfolio public untuk landing page.
5. Artikel dan kalkulator DCF belum ada.

## Target Struktur Halaman

1. `/`
   Landing page publik.
2. `/login`
   Halaman login/register dari flow existing.
3. `/app`
   Dashboard existing yang hanya bisa diakses user login.
4. `/articles`
   List artikel.
5. `/articles/:slug`
   Detail artikel.
6. `/calculator/dcf`
   Halaman kalkulator DCF.
7. `/public-portfolios`
   List portfolio public.
8. `/shared/portfolio/:shareToken`
   Detail portfolio public yang sudah ada.

## Aturan Routing yang Harus Jelas

1. Visitor yang belum login tetap bisa buka semua public route:
   - `/`
   - `/articles`
   - `/articles/:slug`
   - `/calculator/dcf`
   - `/public-portfolios`
   - `/shared/portfolio/:shareToken`
2. Route `/app` wajib login.
3. Jika user belum login lalu buka `/app`, tampilkan halaman auth existing.
4. Jika user sudah login lalu buka `/login`, arahkan ke `/app`.
5. Landing page `/` tetap public walaupun user sudah login. Tombol CTA cukup berubah menjadi `Buka Dashboard`.

## Susunan Web Fragment untuk Landing Page

Urutan fragment yang disarankan:

1. Top Navigation
   Berisi logo/app name, menu `Artikel`, `Kalkulator DCF`, `Portfolio Public`, `Tentang Kami`, dan tombol `Login` atau `Buka Dashboard`.
2. Hero Section
   Headline singkat, subheadline, CTA utama ke kalkulator DCF, CTA kedua ke login/dashboard.
3. Value Proposition Strip
   Tiga poin cepat: catat investasi, pelajari valuasi, lihat portfolio public.
4. DCF Calculator Preview
   Tampilkan versi ringkas kalkulator langsung di landing atau embed calculator penuh yang sama dengan halaman `/calculator/dcf`.
5. Public Portfolio Highlight
   Tampilkan 3 sampai 6 card portfolio public terbaru dengan tombol `Lihat Portfolio`.
6. Latest Articles
   Tampilkan 3 artikel terbaru dengan tombol ke `/articles`.
7. About Us
   Jelaskan produk ini untuk siapa, kenapa dibuat, dan batasan bahwa tools ini membantu analisis, bukan financial advice.
8. Final CTA
   Tombol `Mulai Login` atau `Buka Dashboard`.
9. Footer
   Link cepat ke Artikel, Kalkulator, Portfolio Public, Login.

## Scope Teknis yang Dipilih

### Frontend

1. Pecah area public dari `App.jsx` ke modul terpisah.
2. Buat route resolver sederhana berbasis `window.location.pathname`.
3. Pertahankan dashboard lama sebisa mungkin.
4. Artikel disimpan di file data lokal.
5. Kalkulator DCF dihitung di frontend lewat utility function pure.

### Backend

1. Tambah endpoint list portfolio public.
2. Reuse mekanisme share token yang sudah ada.
3. Jangan buat CMS artikel.
4. Jangan simpan hasil kalkulator DCF ke database.

## Desain Data untuk Artikel Fase 1

Simpan artikel sebagai array object lokal di frontend, misalnya di `frontend/src/data/articles.js`.

Field minimum:

1. `slug`
2. `title`
3. `excerpt`
4. `category`
5. `publishedAt`
6. `readingTime`
7. `coverLabel` atau `coverAccent`
8. `content`

Format `content` jangan markdown parser dulu. Gunakan array block sederhana seperti:

1. `paragraph`
2. `heading`
3. `bullet_list`

Alasan:

1. tidak butuh dependency baru
2. lebih aman untuk model murah
3. rendering lebih mudah diuji

## Spesifikasi Kalkulator DCF

Input minimal:

1. `currentFcf`
2. `growthRate`
3. `discountRate`
4. `terminalGrowthRate`
5. `sharesOutstanding`
6. `cash`
7. `debt`
8. `marketPrice`

Aturan hitung:

1. Pakai proyeksi 5 tahun.
2. `fcfYearN = currentFcf * (1 + growthRate)^n`
3. `pvFcfYearN = fcfYearN / (1 + discountRate)^n`
4. `terminalValue = (fcfYear5 * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate)`
5. `pvTerminalValue = terminalValue / (1 + discountRate)^5`
6. `enterpriseValue = totalPvFcf + pvTerminalValue`
7. `equityValue = enterpriseValue + cash - debt`
8. `intrinsicValuePerShare = equityValue / sharesOutstanding`
9. `premiumDiscountPercent = ((marketPrice - intrinsicValuePerShare) / intrinsicValuePerShare) * 100`

Validasi wajib:

1. `discountRate > terminalGrowthRate`
2. `sharesOutstanding > 0`
3. semua input numerik valid
4. jika invalid, tampilkan error message yang jelas

Output minimal:

1. intrinsic value per share
2. status `Undervalued`, `Fair`, atau `Overvalued`
3. premium/discount percent
4. tabel proyeksi 5 tahun

## API Baru yang Dibutuhkan

Tambahkan endpoint:

1. `GET /api/public/portfolios`

Tujuan:

1. menampilkan daftar portfolio public di landing page
2. menampilkan halaman `/public-portfolios`

Response minimum per item:

1. `id`
2. `name`
3. `currency`
4. `share_token`
5. `owner_name`
6. `updated_at`

Catatan:

1. cukup list sederhana dulu
2. jangan hitung metrik berat per card pada fase awal
3. frontend membangun URL detail dari `share_token`

## File yang Boleh Disentuh

Frontend utama:

1. `frontend/src/App.jsx`
2. `frontend/src/services/api.js`
3. `frontend/src/styles.css`

Frontend baru yang disarankan:

1. `frontend/src/modules/public/PublicLayout.jsx`
2. `frontend/src/modules/public/LandingPage.jsx`
3. `frontend/src/modules/public/ArticlesPage.jsx`
4. `frontend/src/modules/public/ArticleDetailPage.jsx`
5. `frontend/src/modules/public/DcfCalculatorPage.jsx`
6. `frontend/src/modules/public/PublicPortfoliosPage.jsx`
7. `frontend/src/modules/public/components/PublicNav.jsx`
8. `frontend/src/modules/public/components/PublicFooter.jsx`
9. `frontend/src/modules/public/components/DcfCalculator.jsx`
10. `frontend/src/modules/public/components/PublicPortfolioCards.jsx`
11. `frontend/src/modules/public/components/ArticleCards.jsx`
12. `frontend/src/data/articles.js`
13. `frontend/src/utils/dcf.js`

Backend:

1. `backend/routes/api.php`
2. `backend/app/Http/Controllers/PortfolioController.php`
3. `backend/app/Services/PortfolioService.php`
4. `backend/app/Repositories/PortfolioRepository.php`
5. `backend/tests/Feature/PortfolioApiTest.php`

## Breakdown Eksekusi untuk Model AI Murah

Kerjakan berurutan. Satu tiket selesai dulu, baru lanjut tiket berikutnya.

### Tiket 1 - Route shell public vs auth

Target:

1. `App.jsx` tidak lagi langsung memaksa login untuk halaman `/`.
2. Ada resolver route sederhana untuk public page, auth page, dashboard, dan shared portfolio.

Langkah:

1. Buat helper route resolver di dalam `App.jsx` atau file kecil terpisah.
2. Extract auth page existing menjadi blok yang lebih terisolasi.
3. Dashboard existing tetap di `AuthenticatedApp`.
4. `PublicPortfolioApp` existing tetap dipakai untuk `/shared/portfolio/:shareToken`.
5. Tambahkan handling `/login` dan `/app`.

Selesai jika:

1. `/` bisa dibuka tanpa login.
2. `/app` tetap meminta auth jika belum login.
3. `/shared/portfolio/:shareToken` tidak rusak.

### Tiket 2 - Backend API list public portfolios

Target:

1. Ada endpoint `GET /api/public/portfolios`.

Langkah:

1. Tambahkan route di `backend/routes/api.php`.
2. Tambahkan method controller baru, misalnya `publicIndex`.
3. Tambahkan service baru untuk mengambil list public.
4. Tambahkan repository query yang hanya mengambil `is_public = true`.
5. Sertakan `owner_name` dengan join ke tabel users atau cara sederhana lain.
6. Tambahkan test feature.

Selesai jika:

1. endpoint bisa diakses tanpa auth
2. hanya portfolio public yang muncul
3. response punya field minimum yang dibutuhkan frontend

### Tiket 3 - Public layout dan landing page

Target:

1. Ada layout publik yang konsisten.
2. Landing page `/` punya fragment yang jelas.

Langkah:

1. Buat `PublicLayout`.
2. Buat komponen nav dan footer.
3. Buat `LandingPage`.
4. Tampilkan hero, value strip, DCF section, public portfolio preview, article preview, about, CTA.
5. Ambil data portfolio public dari API baru.
6. Gunakan konten statis sederhana untuk copywriting awal.

Selesai jika:

1. halaman `/` lengkap dan rapi
2. CTA login/dashboard bekerja
3. section portfolio public menampilkan data nyata dari backend

### Tiket 4 - Kalkulator DCF

Target:

1. Ada halaman `/calculator/dcf`.
2. Ada komponen calculator yang bisa dipakai ulang di landing page.

Langkah:

1. Buat `frontend/src/utils/dcf.js` berisi fungsi hitung pure.
2. Buat komponen `DcfCalculator`.
3. Tampilkan form input, validasi, hasil utama, dan tabel proyeksi.
4. Reuse komponen ini di landing page.
5. Tampilkan label premium/discount terhadap `marketPrice`.

Selesai jika:

1. input valid menghasilkan output konsisten
2. input invalid memunculkan pesan error
3. tidak ada logic hitung DCF yang tercecer di banyak file

### Tiket 5 - Artikel

Target:

1. Ada halaman `/articles`.
2. Ada halaman `/articles/:slug`.

Langkah:

1. Buat `articles.js` dengan minimal 3 artikel.
2. Buat list page artikel.
3. Buat detail page artikel berdasarkan `slug`.
4. Tampilkan 3 artikel terbaru di landing page.
5. Tambahkan empty/fallback state jika slug tidak ditemukan.

Selesai jika:

1. `/articles` menampilkan list artikel
2. `/articles/some-slug` menampilkan isi artikel
3. landing page punya preview artikel

### Tiket 6 - Halaman `/public-portfolios`

Target:

1. Ada halaman khusus list portfolio public, bukan hanya preview di landing.

Langkah:

1. Buat page `PublicPortfoliosPage`.
2. Reuse komponen card dari landing page.
3. Tampilkan empty state jika belum ada portfolio public.
4. Tombol `Lihat Portfolio` mengarah ke `/shared/portfolio/:shareToken`.

Selesai jika:

1. halaman ini bisa diakses tanpa login
2. data konsisten dengan preview landing page

### Tiket 7 - Polishing dan testing

Target:

1. Fitur baru stabil.
2. Behaviour lama tidak rusak.

Langkah:

1. Tambahkan test frontend untuk route public minimal.
2. Tambahkan test util DCF.
3. Tambahkan test render article list/detail jika memungkinkan.
4. Jalankan `frontend` tests.
5. Jalankan `backend` tests.

Selesai jika:

1. test utama lolos
2. public portfolio lama tetap bisa dibuka
3. auth flow lama tetap bekerja

## Acceptance Criteria Final

1. Visitor bisa membuka `/` tanpa login.
2. Landing page menampilkan:
   - artikel preview
   - kalkulator DCF
   - tentang kami
   - portfolio public
   - tombol login atau buka dashboard
3. User belum login tidak bisa masuk ke `/app` tanpa auth flow.
4. User bisa membuka `/articles` dan `/articles/:slug`.
5. User bisa membuka `/calculator/dcf`.
6. User bisa membuka `/public-portfolios`.
7. User bisa membuka `/shared/portfolio/:shareToken` seperti sebelumnya.
8. Tidak ada perubahan pada mobile app.
9. Tidak ada kebutuhan CMS atau database baru untuk artikel.

## Non-Goal Fase Ini

1. Admin panel artikel.
2. Editor artikel berbasis markdown.
3. Menyimpan hasil DCF ke database.
4. Bookmark artikel.
5. Search artikel.
6. Filter portfolio public yang kompleks.
7. Refactor total dashboard existing.

## Urutan Eksekusi yang Paling Aman

1. Tiket 1
2. Tiket 2
3. Tiket 3
4. Tiket 4
5. Tiket 5
6. Tiket 6
7. Tiket 7

## Catatan Penting

1. Jangan mulai dari artikel atau DCF dulu sebelum route shell public selesai.
2. Jangan memindahkan logic dashboard lama lebih dari yang diperlukan.
3. Jika ada kebutuhan copywriting, pakai placeholder yang rapi dan netral terlebih dahulu.
4. Jika suatu keputusan ambigu, pilih solusi yang paling sederhana dan konsisten dengan repo saat ini.
