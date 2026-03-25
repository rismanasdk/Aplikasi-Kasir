# Kasir Plus

[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

Kasir Plus adalah aplikasi Point of Sale (POS) berbasis `React + Vite` di frontend dan `Express + MongoDB` di backend. Project ini mendukung multi-role (`admin`, `manajer`, `kasir`, `chef`, `user`), update data real-time dengan `Socket.IO`, pembayaran online melalui `Midtrans`, upload gambar lewat `Cloudinary`, dan sinkronisasi stok berbasis `Firebase RTDB`.

## Ringkasan Fitur

- Multi-role login: `admin`, `manajer`, `kasir`, `chef`, `user`
- Login manual dan Google OAuth
- Dashboard publik untuk pelanggan / user
- Manajemen produk, kategori, bahan baku, data satuan, modal utama
- Keranjang, checkout, transaksi tunai dan non-tunai
- Midtrans callback untuk update status pembayaran
- Laporan penjualan, HPP, omzet, metode pembayaran
- Sinkronisasi stok real-time dengan `Socket.IO` dan `Firebase`
- Upload logo toko, foto profil, dan gambar produk

## Struktur Project

```text
Aplikasi-Kasir/
├─ backend/    # API Express, MongoDB, Midtrans, Firebase, Cloudinary
├─ frontend/   # React, TypeScript, Vite, Tailwind
├─ uploads/    # File upload lokal sementara / legacy
└─ README.md
```

## Tech Stack

- Frontend: `React 19`, `TypeScript`, `Vite`, `TailwindCSS`, `Axios`, `Socket.IO Client`, `Recharts`, `Framer Motion`
- Backend: `Node.js`, `Express`, `MongoDB`, `Mongoose`, `Socket.IO`, `Helmet`, `express-rate-limit`, `passport-google-oauth20`
- Integrasi: `Midtrans`, `Cloudinary`, `Firebase Admin`

## Cara Menjalankan

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

Backend berjalan di `http://localhost:5000` secara default.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173` secara default.

## Environment Backend

Isi file `backend/.env` berdasarkan `backend/.env.example`.

```env
# Database
MONGO_URI=
FIREBASE_DATABASE_URL=

# Authentication
JWT_SECRET=
SESSION_SECRET=

# Midtrans
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# App
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
ENABLE_DEBUG_TOKEN_LOGGER=false
```

Catatan:

- `SESSION_SECRET` wajib, jika kosong backend akan crash saat start.
- `JWT_SECRET` wajib untuk login, route protected, dan Google callback token.
- Jika memakai Google OAuth lokal, callback backend mengarah ke `/api/auth/google/callback`.
- Jika memakai Firebase service account, file `backend/config/firebase-service-account.json` tidak boleh di-commit.

## Environment Frontend

Frontend menggunakan variabel utama berikut:

```env
VITE_API_URL=http://localhost:5000
VITE_API_KEY=
```

Catatan:

- `VITE_API_URL` harus mengarah ke backend aktif.
- `VITE_API_KEY` saat ini masih bersifat opsional karena validasi API key di backend belum diterapkan penuh.

## Script Penting

### Backend

```bash
npm start
```

Script tambahan yang tersedia di folder `backend/scripts/`:

- `create-test-chef.js`
- `create-test-bahanbaku.js`
- `recalc-prices.js`
- `recalc-total-harga-bahan.js`
- `migrate-to-firebase.js`

Jalankan manual bila memang dibutuhkan, misalnya:

```bash
node scripts/migrate-to-firebase.js
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Role Akses

- `admin`: akses penuh ke pengaturan, user, stok, laporan, dashboard admin
- `manajer`: akses monitoring dashboard, stok, laporan, beberapa settings
- `kasir`: transaksi dan pesanan
- `chef`: bahan baku dan produksi
- `user`: dashboard publik, keranjang, checkout, riwayat pribadi

## Arsitektur Singkat

- Frontend menyimpan token login dan info user di browser untuk route protection.
- Backend memverifikasi token JWT untuk route manager, admin, chef, dan user tertentu.
- Midtrans callback mengubah status transaksi dan mengembalikan stok bila pembayaran gagal / expired.
- Data stok disiarkan ulang lewat `Socket.IO` agar dashboard terkait ikut update tanpa refresh penuh.

## Catatan Pengembangan

- Beberapa route backend sudah diproteksi dengan `verifyToken` + `authorize`, tetapi masih ada area yang perlu diperketat.
- Folder auth frontend masih memiliki beberapa file duplikat / legacy yang bisa dirapikan.
- Jika banyak perubahan besar dilakukan, prioritaskan update dokumentasi di README ini dan `frontend/README.md`.

## Checklist Setup Cepat

1. Isi `backend/.env`
2. Jalankan backend
3. Isi `frontend/.env` bila diperlukan
4. Jalankan frontend
5. Pastikan `VITE_API_URL` cocok dengan URL backend
6. Pastikan `CORS_ORIGIN` backend mengizinkan origin frontend
