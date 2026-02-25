# 🛒 Kasir Plus

<!-- ![KasirPlus Dashboard Preview](https://res.cloudinary.com/dmrpx33rn/image/upload/v1761725178/Screenshot_from_2025-10-29_15-04-26_pq5f4h.png)

[![Node.js](https://img.shields.io/badge/Node.js-v18-green)](https://nodejs.org/) 
[![React](https://img.shields.io/badge/React-v18-blue)](https://reactjs.org/) 
[![MongoDB](https://img.shields.io/badge/MongoDB-v6-green)](https://www.mongodb.com/) 
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3-blue)](https://tailwindcss.com/)  -->
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Kasir Plus** adalah sistem Point of Sale (POS) modern yang memudahkan pengelolaan **transaksi penjualan, stok barang, dan laporan keuangan**.  
Tersedia frontend interaktif dan backend API dengan **real-time update**, serta integrasi pembayaran **Midtrans (sandbox)**.


---------------------------------------------------------------------

## 🎯 Fitur Utama

### 👤 Autentikasi Pengguna
- Multi-role: Admin, Manajer, Kasir, User, Chef
- Login & Logout + Login via Google

### 🛍️ Manajemen Produk
- CRUD produk & kategori
- Upload foto produk
- Tampilan responsif dengan **TailwindCSS**

### 💳 Transaksi
- Tambah item ke keranjang
- Checkout dan beli langsung
- Integrasi **Midtrans Sandbox** untuk pembayaran online
- Pembayaran (VA, E-Wallet via qris, Tunai)
- Riwayat transaksi lengkap

### 📊 Laporan
- Laporan penjualan harian, mingguan, bulanan
- Export ke **PDF / Excel**
- Visualisasi data menggunakan **Recharts**

### ⚡ Frontend Interaktif
- Sidebar navigasi responsif
- Quick view produk
- Panel keranjang interaktif
- Animasi smooth dengan **Framer Motion**
- Icon menggunakan **Lucide Icons**
- Axios & Socket.io untuk komunikasi backend

### 🌐 Backend API
- Node.js + Express + MongoDB + Helmet
- Endpoint CRUD lengkap untuk produk, kategori, transaksi
- Socket.io untuk **update stok & transaksi real-time**
- Firebase untuk real-time update stok barang 
- Integrasi Midtrans untuk payment gateway
- Cloudinary untuk upload & penyimpanan gambar
- CORS diaktifkan untuk memungkinkan akses frontend ke backend melalui API

------------------------------------------------------------------

## 📁 Struktur Folder

Kasir-Plus/
├─ frontend/ # React + TypeScript + Tailwind + Framer Motion + Recharts + Lucide
├─ backend/ # Node.js + Express + MongoDB + Firebase + Socket.io + Midtrans + Cloudinary
├─ README.md
└─ .gitignore



------------------------------------------------------------------

## 🚀 Teknologi & Tools

- **Frontend:** React, TypeScript, TailwindCSS, Framer Motion, Recharts, Lucide, Axios, Socket.io-client  
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.io, Midtrans, Cloudinary
- **Database:** MongoDB, Firebase
- **Payment Gateway:** Midtrans (sandbox)
- **Lainnya:** Git, GitHub, Ngrok  

-------------------------------------------------------------------
⚙️ Cara Menjalankan

1️⃣ Frontend
```bash
cd frontend
npm install
npm run dev

2️⃣ Backend
cd backend
npm install
# Buat file .env berdasarkan .env.example -> isi dengan benar
untuk google isi seperti ini:
Authorized JavaScript origins:http://localhost:5173
Authorized redirect URIs:URLNGROK/api/auth/google/callback
node scripts/migrate-to-firebase.js
npm start   # npm start dengan nodemon

3️⃣ Koneksi MongoDB
MONGO_URI=mongodb://localhost:27017/nama_database
PORT=5000

4️⃣ Testing Ngrok (opsional)
ngrok http 3000   # frontend
ngrok http 5000   # backend

-------------------------------------------------------------------

💰 Integrasi Midtrans (Sandbox)

1.Daftar di Midtrans Dashboard
 → aktifkan sandbox mode.

2.Ambil SERVER_KEY & CLIENT_KEY.

3.Tambahkan ke .env backend:

MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_IS_PRODUCTION=false


4.Pastikan frontend menggunakan endpoint backend untuk generate transaksi.

5.Gunakan nomor kartu virtual sandbox untuk testing pembayaran.

📈 Real-Time Update

Socket.io digunakan untuk update stok & transaksi secara real-time antar user di frontend.







