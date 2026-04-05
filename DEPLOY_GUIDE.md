# 📋 Panduan Deploy — Sistem Kas Kelas

## Prasyarat
- Akun Google
- Google Chrome / browser modern
- Node.js terinstall (untuk React)

---

## Bagian 1: Setup Google Sheets + Apps Script

### Langkah 1 — Buat Google Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com)
2. Klik **"+ Blank"** untuk membuat spreadsheet baru
3. Beri nama, misalnya: `Kas Kelas 2025`
4. Ingat URL spreadsheet (akan dibutuhkan nanti)

---

### Langkah 2 — Buka Apps Script Editor

1. Di Google Sheets, klik menu **Extensions → Apps Script**
2. Editor script akan terbuka di tab baru
3. Hapus semua kode yang ada di `Code.gs`

---

### Langkah 3 — Salin Kode Backend

1. Buka file `gas/Code.gs` di project ini
2. Copy **semua** isinya
3. Paste ke editor Apps Script (gantikan kode yang ada)
4. Klik ikon **💾 Save** (atau `Ctrl+S`)
5. Beri nama project, misalnya: `Kas Kelas API`

---

### Langkah 4 — Deploy sebagai Web App

1. Klik tombol **Deploy** (pojok kanan atas)
2. Pilih **"New deployment"**
3. Klik ikon ⚙️ lalu pilih **"Web app"**
4. Isi konfigurasi:
   - **Description**: `Kas Kelas v1.0`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` ← **PENTING! Pilih ini agar bisa diakses dari React**
5. Klik **Deploy**
6. Izinkan akses Google (klik "Review permissions" lalu "Allow")
7. **Copy URL Web App yang muncul** — formatnya:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> ⚠️ **Simpan URL ini!** Anda akan butuh URL ini di langkah berikutnya.

---

## Bagian 2: Hubungkan URL ke React

### Langkah 5 — Edit App.jsx

1. Buka file `src/App.jsx`
2. Temukan baris:
   ```js
   const GAS_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
   ```
3. Ganti `YOUR_SCRIPT_ID` dengan ID script dari URL yang Anda copy tadi:
   ```js
   const GAS_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Simpan file

---

## Bagian 3: Jalankan Aplikasi React

### Langkah 6 — Install & Jalankan

```bash
# Install dependencies (jika belum)
npm install

# Jalankan dev server
npm run dev
```

4. Buka browser ke `http://localhost:5173`

---

## Bagian 4: Build untuk Production

```bash
npm run build
```

File hasil build ada di folder `dist/`. Bisa di-deploy ke:
- **Netlify** (drag & drop folder `dist`)
- **Vercel** (`vercel --prod`)
- **GitHub Pages**

---

## Cara Kerja Sistem Periode

```
Periode 1 (Sheet: "Periode 1")     Periode 2 (Sheet: "Periode 2")
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Nama | Minggu | Jumlah | Tgl │   │ Nama | Minggu | Jumlah | Tgl │
│ Andi |   1   | 5000   | ... │   │ Andi |   1   | 5000   | ... │
│ Budi |   2   | 5000   | ... │   │ ...                          │
│ Andi |   3   | 5000   | ... │   └──────────────────────────────┘
│ Budi |   4   | 5000   | ... │   ↑ Sheet baru otomatis dibuat
└──────────────────────────────┘   saat ada input Minggu 1 setelah
                                   Minggu 4 sudah ada di sheet terakhir
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Error CORS | Pastikan "Who has access" = `Anyone` saat deploy |
| Data tidak masuk | Cek URL GAS_URL di App.jsx sudah benar |
| 401 Unauthorized | Re-deploy Apps Script dengan akses `Anyone` |
| Sheet baru tidak dibuat | Pastikan ada data minggu 4 di sheet terakhir sebelum input minggu 1 |

---

## Update Kode Apps Script

Jika Anda mengubah kode di `Code.gs`:
1. Kembali ke Apps Script editor
2. Update kode
3. Klik **Deploy → Manage deployments**
4. Edit deployment yang ada → klik **"New version"** → **Deploy**
   > Gunakan URL yang **sama**, tidak perlu update di React

---

*Dibuat dengan ❤️ menggunakan React + Vite + Google Apps Script*
