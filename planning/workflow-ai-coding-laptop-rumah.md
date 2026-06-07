# Planning Workflow AI Coding dari HP dan Laptop Rumah

## Tujuan

Mengimplementasikan workflow kerja dimana HP dipakai untuk membuat dan memantau task, GitHub menjadi pusat kontrol, dan laptop rumah menjalankan coding, build, test, commit, serta Pull Request untuk project Investment Journal.

Dokumen ini adalah hasil review dari `workflow_ai_coding_laptop_rumah.docx`, lalu disesuaikan dengan kondisi repo ini agar bisa dieksekusi bertahap.

## Ringkasan Review

Workflow utama dari dokumen sumber layak dipakai:

1. Laptop rumah menjadi mesin kerja utama yang selalu menyala.
2. HP dipakai untuk membuat GitHub Issue dan review Pull Request.
3. GitHub Issue menjadi antrean task.
4. Branch dan Pull Request wajib dipakai agar hasil AI tidak langsung masuk ke `main` atau `master`.
5. Remote control memakai Tailscale atau Chrome Remote Desktop bila perlu.
6. Implementasi dimulai manual dulu, lalu naik ke semi-otomatis setelah pola task stabil.

Penyesuaian penting untuk project ini:

1. Dokumen sumber memberi contoh backend Golang dan PostgreSQL, tetapi repo ini memakai Laravel/PHP dan MySQL.
2. Project ini punya tiga area aktif: `backend/`, `frontend/`, dan `mobile/`.
3. Folder `backend_blueprint/`, `backend_custom/`, dan `frontend/dist/` sebaiknya dianggap non-target untuk pekerjaan AI rutin.
4. Repo sudah punya test backend, frontend, dan mobile, jadi workflow harus selalu mengarahkan agent untuk menjalankan test sesuai scope perubahan.
5. Karena project ini menyimpan logic finansial, task AI harus memakai acceptance criteria yang eksplisit dan tidak boleh refactor besar tanpa alasan.

## Kondisi Repo Saat Ini

Stack aktual:

1. Backend: Laravel 10, PHP 8.1, MySQL 8, API token auth.
2. Web frontend: React 18, Vite, Vitest.
3. Mobile: React Native, Expo, Jest.
4. Database lokal: MySQL via Docker Compose.
5. Arsitektur backend utama: `Controller -> Service -> Repository`.
6. Financial precision: MySQL `DECIMAL` dan BCMath, bukan float.

Folder penting:

1. `backend/`: aplikasi Laravel aktif.
2. `frontend/`: aplikasi web React aktif.
3. `mobile/`: aplikasi React Native aktif.
4. `docs/`: dokumentasi API, ERD, business rules, struktur folder.
5. `planning/`: dokumen planning task.

Folder yang perlu dihindari oleh agent untuk task rutin:

1. `backend_blueprint/`
2. `backend_custom/`
3. `frontend/dist/`
4. file `.env` atau credential lokal

## Target Workflow

Alur kerja final:

1. Dari HP, user membuat GitHub Issue memakai template `AI Task`.
2. Issue diberi label `ai-task`.
3. Laptop rumah membaca issue tersebut secara manual atau semi-otomatis.
4. Laptop membuat branch baru dengan format `ai/<issue-number>-<slug>`.
5. Codex atau AI agent mengerjakan task di branch tersebut.
6. Agent menjalankan test sesuai scope.
7. Agent commit dan push branch.
8. Agent membuat Pull Request.
9. User review PR dari HP atau laptop.
10. Merge hanya dilakukan setelah review aman.

## Prinsip Keamanan

1. Jangan gunakan PC kantor untuk coding project pribadi, kecuali hanya monitoring dan kebijakan kantor mengizinkan.
2. Jangan commit langsung ke `main` atau `master`.
3. Jangan commit `.env`, token, password, key, database dump pribadi, atau credential hosting.
4. Jangan buka SSH laptop rumah langsung ke internet publik. Gunakan Tailscale, VPN, atau Chrome Remote Desktop.
5. Batasi token GitHub sesuai kebutuhan.
6. Backup database lokal sebelum migration besar atau perubahan schema berisiko.
7. Review semua perubahan AI sebelum merge.
8. Task yang menyentuh transaksi, cash mutation, dividend, realized PnL, weighted average, atau price sync wajib punya test.

## Label GitHub yang Disarankan

Buat label berikut di GitHub:

1. `ai-task`: task boleh dikerjakan AI.
2. `ai-ready`: requirement sudah cukup jelas.
3. `ai-in-progress`: sedang dikerjakan laptop rumah.
4. `needs-review`: PR siap direview user.
5. `blocked`: agent butuh keputusan user.
6. `backend`: menyentuh Laravel API.
7. `frontend`: menyentuh React web.
8. `mobile`: menyentuh React Native app.
9. `db-migration`: menyentuh database migration.
10. `financial-logic`: menyentuh perhitungan finansial.

## File yang Perlu Ditambahkan ke Repo

Tahap awal sebaiknya menambahkan file standar agar AI punya konteks tetap.

1. `.ai/architecture.md`
2. `.ai/coding-rules.md`
3. `.ai/task-template.md`
4. `.github/ISSUE_TEMPLATE/ai-task.yml`
5. `.github/PULL_REQUEST_TEMPLATE.md`
6. `docs/backlog.md`
7. `scripts/ai/prepare-ai-task.sh`
8. `scripts/ai/create-ai-pr.sh`

Catatan:

1. Script lokal tidak boleh menyimpan token di repository.
2. Jika script menghasilkan prompt atau log task, simpan di folder yang di-ignore, misalnya `.ai/runs/`.
3. Jika memakai `.ai/local.env`, file itu wajib masuk `.gitignore`.

## Isi Minimal `.ai/architecture.md`

```md
# Architecture

Project: Investment Journal

Backend:
- Laravel 10
- PHP 8.1
- MySQL 8
- API token auth
- Pattern: Controller -> Service -> Repository

Frontend:
- React 18
- Vite
- Vitest

Mobile:
- React Native
- Expo
- Jest

Rules:
- Jangan ubah struktur besar tanpa alasan jelas.
- Semua fitur baru harus lewat branch baru dan Pull Request.
- Semua perubahan database harus memakai migration.
- Semua financial field harus menjaga DECIMAL/BCMath, bukan float.
- Jangan commit API key, password, token, file .env, atau credential.
- Jangan edit backend_blueprint, backend_custom, atau frontend/dist untuk task rutin.
- Sebelum PR, jalankan build dan test sesuai scope perubahan.
```

## Isi Minimal `.ai/coding-rules.md`

```md
# Coding Rules

General:
- Kerjakan scope issue saja.
- Jangan refactor file yang tidak terkait.
- Jangan mengubah public API tanpa disebut di acceptance criteria.
- Jangan membuat dependency baru kecuali sangat diperlukan dan dijelaskan di PR.

Backend:
- Ikuti pola Controller -> Service -> Repository.
- Business logic utama masuk Service.
- Query database masuk Repository.
- Gunakan migration untuk perubahan schema.
- Gunakan DECIMAL/BCMath untuk uang, lot, saham, average price, PnL, dan dividend.
- Tambahkan atau update Feature Test untuk endpoint API.

Frontend:
- Ikuti struktur module yang sudah ada di frontend/src/modules.
- Logic hitung yang bisa diuji sebaiknya masuk frontend/src/utils.
- Tambahkan atau update Vitest/Testing Library test untuk perubahan penting.
- Jangan edit frontend/dist.

Mobile:
- Sentuh mobile hanya jika issue memberi scope mobile.
- Tambahkan atau update Jest test bila behaviour berubah.

Verification:
- Backend: docker compose exec app php artisan test
- Frontend: cd frontend && npm test
- Frontend build: cd frontend && npm run build
- Mobile: cd mobile && npm test
```

## Template GitHub Issue dari HP

Template ini harus tersedia di `.github/ISSUE_TEMPLATE/ai-task.yml` atau minimal dicopy ke `.ai/task-template.md`.

```md
Title: [AI Task] <judul singkat>

Context:
- Project: Investment Journal
- Area: backend / frontend / mobile / docs
- Related files:
- Related docs:

Goal:
- Jelaskan hasil akhir yang diinginkan user.

Scope:
- Item yang boleh dikerjakan.

Out of Scope:
- Item yang tidak boleh disentuh.

Acceptance Criteria:
- Kriteria selesai yang bisa dicek.
- Sebut endpoint, halaman, test, atau behaviour yang harus lolos.

Verification:
- Command test/build yang wajib dijalankan.

Constraints:
- Jangan commit ke main/master.
- Buat branch baru.
- Buat Pull Request untuk review.
- Jangan commit file rahasia atau .env.
```

## Template Pull Request

Isi minimal `.github/PULL_REQUEST_TEMPLATE.md`:

```md
## Summary

- 

## Scope

- 

## Verification

- [ ] Backend tests
- [ ] Frontend tests
- [ ] Frontend build
- [ ] Mobile tests
- [ ] Manual test

## Risk Notes

- 

## Linked Issue

Closes #
```

## Command Lokal yang Dipakai

Setup laptop rumah:

```bash
git clone git@github.com:<username>/<repo>.git
cd InvestmentJournal
docker compose up --build -d
docker compose exec app php artisan migrate
cd frontend
npm install
cd ../mobile
npm install
```

Verifikasi backend:

```bash
docker compose exec app php artisan test
```

Verifikasi frontend:

```bash
cd frontend
npm test
npm run build
```

Verifikasi mobile jika disentuh:

```bash
cd mobile
npm test
```

Branch dan PR manual:

```bash
git checkout -b ai/123-watchlist-feature
git status
git add .
git commit -m "feat: add watchlist feature"
git push origin ai/123-watchlist-feature
gh pr create --title "feat: add watchlist feature" --body "Closes #123"
```

## Breakdown Implementasi

Kerjakan bertahap. Jangan langsung membuat full automation sebelum workflow manual stabil.

### Tiket 1 - Tambah Dokumentasi AI Project

Target:

1. Ada folder `.ai/`.
2. Ada `architecture.md`, `coding-rules.md`, dan `task-template.md`.
3. Isi dokumen sesuai stack aktual Investment Journal.

Selesai jika:

1. AI bisa membaca aturan project tanpa membuka banyak file.
2. Aturan backend, frontend, mobile, database, dan security tertulis jelas.
3. Folder legacy dan build output masuk daftar yang tidak disentuh.

### Tiket 2 - Tambah Template Issue dan PR

Target:

1. Ada `.github/ISSUE_TEMPLATE/ai-task.yml`.
2. Ada `.github/PULL_REQUEST_TEMPLATE.md`.
3. Template issue cocok dipakai dari GitHub Mobile.

Selesai jika:

1. Issue baru punya field context, goal, scope, acceptance criteria, verification, dan constraints.
2. PR baru punya checklist verifikasi.
3. Template mengingatkan agar branch baru dipakai dan file rahasia tidak dicommit.

### Tiket 3 - Siapkan Label dan Rutinitas Manual

Target:

1. Label GitHub dibuat.
2. Workflow Level 1 bisa dijalankan dari HP dan remote laptop.

Langkah:

1. Buat label `ai-task`, `ai-ready`, `ai-in-progress`, `needs-review`, `blocked`, `backend`, `frontend`, `mobile`, `db-migration`, dan `financial-logic`.
2. Dari HP, buat satu issue kecil sebagai pilot.
3. Remote ke laptop rumah.
4. Jalankan Codex/VS Code secara manual untuk mengerjakan issue.
5. Push branch dan buat PR.

Selesai jika:

1. Satu task kecil bisa selesai lewat issue, branch, dan PR.
2. User bisa review PR dari HP.
3. Tidak ada commit langsung ke `main` atau `master`.

### Tiket 4 - Tambah Script Prepare AI Task

Target:

1. Ada script lokal `scripts/ai/prepare-ai-task.sh`.
2. Script mengambil issue GitHub dan menyiapkan branch serta prompt awal.

Perilaku script:

1. Input: nomor issue.
2. Validasi `gh` sudah login.
3. Ambil title, body, labels, dan URL issue.
4. Buat branch `ai/<issue-number>-<slug>`.
5. Simpan prompt kerja ke `.ai/runs/<issue-number>/prompt.md`.
6. Tambahkan komentar progress ke issue bahwa task mulai dikerjakan.

Selesai jika:

1. `scripts/ai/prepare-ai-task.sh 123` membuat branch baru.
2. Prompt issue tersimpan lokal.
3. `.ai/runs/` tidak ikut ter-commit.

### Tiket 5 - Tambah Script Create PR

Target:

1. Ada script lokal `scripts/ai/create-ai-pr.sh`.
2. Script membantu push branch dan membuat Pull Request.

Perilaku script:

1. Cek current branch bukan `main` atau `master`.
2. Tampilkan `git status`.
3. Menolak lanjut jika tidak ada commit.
4. Push branch ke origin.
5. Buat PR dengan `gh pr create`.
6. Tambahkan komentar ke issue bahwa PR siap review.

Selesai jika:

1. Branch AI bisa dipush dengan command konsisten.
2. PR punya link ke issue.
3. Issue diberi status progress.

### Tiket 6 - Semi-Otomatisasi Queue Issue

Target:

1. Laptop rumah bisa mengecek issue berlabel `ai-task` dan `ai-ready`.
2. Agent belum perlu coding otomatis penuh; cukup membuat daftar task siap kerja.

Perilaku:

1. Script mencari issue open dengan label `ai-task` dan `ai-ready`.
2. Script mengabaikan issue dengan label `ai-in-progress`, `blocked`, atau `needs-review`.
3. Script menampilkan prioritas task dan command prepare yang harus dijalankan.

Selesai jika:

1. Dari laptop rumah, user bisa melihat antrean AI task dengan satu command.
2. Tidak ada task yang otomatis dikerjakan tanpa user memilih issue.

### Tiket 7 - Otomatisasi Penuh Setelah Stabil

Target:

1. Agent berjalan berkala di laptop rumah.
2. Agent mengambil satu issue siap kerja, membuat branch, menjalankan AI coding, test, commit, push, dan PR.

Syarat sebelum tiket ini:

1. Minimal 5 task berhasil lewat workflow manual atau semi-otomatis.
2. Template issue terbukti cukup jelas.
3. User sudah nyaman review PR dari HP.
4. Tidak ada insiden credential, branch salah, atau test sering dilewati.

Selesai jika:

1. Agent hanya bekerja pada issue berlabel `ai-task` dan `ai-ready`.
2. Agent tidak pernah push ke `main` atau `master`.
3. Agent selalu menulis komentar progress ke issue.
4. Agent berhenti dan memberi label `blocked` jika acceptance criteria tidak jelas atau test gagal berulang.

## Guardrails Khusus Investment Journal

1. Perubahan schema wajib lewat migration di `backend/database/migrations`.
2. Perubahan API wajib update atau tambah test di `backend/tests/Feature`.
3. Perubahan calculation financial wajib update test terkait.
4. Perubahan web wajib pertimbangkan test di `frontend/src/**/*.test.jsx` atau `frontend/src/**/*.test.js`.
5. Perubahan mobile wajib pertimbangkan test di `mobile/src/**/*.test.js` atau `mobile/App.test.js`.
6. Jangan mengubah `docs/BUSINESS_RULES.md` kecuali memang task adalah update business rules.
7. Jangan mengubah generated output seperti `frontend/dist`.
8. Jangan menambahkan queue/Redis requirement karena backend dirancang shared-hosting friendly.
9. Jangan mengubah deploy flow hosting tanpa issue khusus.
10. Jangan memasukkan rekomendasi finansial otomatis ke UI tanpa disclaimer dan scope produk yang jelas.

## Definition of Done untuk Setiap AI Task

Sebuah task AI dianggap selesai jika:

1. Branch dibuat dari base branch terbaru.
2. Scope issue terpenuhi.
3. Acceptance criteria terpenuhi.
4. Test/build sesuai scope sudah dijalankan atau alasan tidak bisa menjalankan ditulis di PR.
5. Tidak ada credential atau file lokal yang ikut commit.
6. PR dibuat dan link issue tercantum.
7. Risiko perubahan ditulis singkat di PR.
8. User bisa review perubahan dari GitHub Mobile.

## Non-Goal

1. Tidak perlu VPS pada fase awal.
2. Tidak perlu full automation sebelum workflow manual stabil.
3. Tidak perlu GitHub Actions kompleks jika laptop rumah sudah menjalankan test lokal.
4. Tidak perlu membuat dashboard monitoring sendiri.
5. Tidak perlu memakai PC kantor sebagai mesin coding.
6. Tidak perlu menyimpan log prompt sensitif ke repository.

## Urutan Eksekusi yang Paling Aman

1. Tiket 1
2. Tiket 2
3. Tiket 3
4. Tiket 4
5. Tiket 5
6. Tiket 6
7. Tiket 7

## Acceptance Criteria Final

Implementasi workflow dianggap selesai jika:

1. Repo punya dokumen `.ai` yang menjelaskan arsitektur dan aturan coding.
2. GitHub Issue dari HP memakai template yang konsisten.
3. GitHub PR memakai template verifikasi.
4. Task AI selalu berjalan di branch `ai/...`.
5. Laptop rumah bisa menjalankan workflow minimal manual end-to-end.
6. Script semi-otomatis bisa menyiapkan branch dan prompt dari issue.
7. Script PR bisa push branch dan membuat PR.
8. Semua perubahan AI tetap direview sebelum merge.

## Catatan Keputusan

Mulai dari Level 1 dulu. Untuk repo ini, risiko terbesar bukan setup automation, tetapi task yang kurang jelas dan perubahan financial logic yang tidak dites. Karena itu, template issue, guardrails, dan PR checklist harus dibuat sebelum script otomatis.
