# Investment Journal Mobile

Frontend mobile berbasis React Native + Expo untuk project Investment Journal. App ini memakai API backend Laravel yang sama dengan frontend web.

## Fitur yang sudah disiapkan

- Login dan register ke endpoint backend yang sama
- Simpan sesi login dengan `AsyncStorage`
- Dashboard mobile dengan ringkasan portfolio
- Pilih portfolio aktif
- Lihat posisi saham dan jurnal transaksi
- Input transaksi `TOPUP`, `WITHDRAW`, `BUY`, `SELL`, `DIVIDEND`

## Jalankan dari nol

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

## Atur URL API

Expo membaca URL backend dari environment variable `EXPO_PUBLIC_API_BASE_URL`.

Contoh simulator di laptop yang sama:

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000 npx expo start
```

Contoh device fisik:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000 npx expo start
```

## Catatan

- Android emulator biasanya memakai `http://10.0.2.2:8000`
- iPhone simulator di macOS biasanya bisa memakai `http://localhost:8000`
