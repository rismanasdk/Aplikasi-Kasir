# Aplikasi Kasir - Backend

Backend untuk aplikasi kasir yang mendukung manajemen barang, transaksi, laporan, dan integrasi realtime stok menggunakan Firebase Realtime Database (RTDB).

---

## Ringkasan Fitur Utama

* **Manajemen Transaksi**

  * Menyimpan transaksi, mendukung Midtrans (VA, QRIS, credit card, dsb) dan callback untuk update status.
  * Stok berkurang otomatis saat transaksi (via RTDB transaction bila tersedia).

* **Manajemen Barang**

  * CRUD barang (nama, harga, stok, gambar).
  * Stok disimpan di MongoDB (metadata) dan disinkronkan ke Firebase RTDB untuk update realtime.

* **Realtime Stok**

  * Perubahan stok ditulis ke Firebase RTDB dan server mem-broadcast event Socket.IO (`stockUpdated`) sehingga UI browser menerima update tanpa refresh.

* **Pengaturan Metode Pembayaran & Biaya Operasional**

  * CRUD untuk metode pembayaran dan biaya operasional.

* **Laporan**

  * Laporan penjualan bulanan/harian dan per-kasir.

---

## Struktur Perubahan Terkait Firebase / Realtime

* `config/firebaseAdmin.js` — inisialisasi `firebase-admin` menggunakan:

  * env var `FIREBASE_SERVICE_ACCOUNT` (JSON string) **atau**
  * file lokal `config/firebase-service-account.json`.

* `scripts/migrate-to-firebase.js` — migrasi data `databarang` dari MongoDB ke RTDB path `/barang/{mongoId}`.

* `controllers/databarangControllers.js`:

  * Membaca stok dari RTDB (jika tersedia) dan merge ke response.
  * Menulis / sync stok, nama, harga ke RTDB saat create/update/delete.
  * Menyediakan endpoint `POST /api/barang/:id/decrement` untuk decrement stok atomik.

* `controllers/datatransaksiController.js`:

  * Saat membuat transaksi, stok dikurangi via RTDB transaction (jika tersedia) atau fallback ke MongoDB.
  * Rollback stok (cancel/expire) menambah stok kembali dan mem-broadcast event.

* Server mem-broadcast event Socket.IO `stockUpdated` setiap kali stok berubah: `{ id, stok }`.

---

## Persyaratan

* Node.js (disarankan v18+)
* MongoDB (Atlas atau lokal)
* Firebase project dengan Realtime Database dan service account

---

## Pengaturan & Instalasi

1. **Install dependencies**

```bash
npm install
npm run check
```

2. **Siapkan konfigurasi environment** (.env contoh):

* `MONGODB_URI` — connection string MongoDB
* `PORT` — port server (default 5000)
* `FIREBASE_SERVICE_ACCOUNT` (opsional) — JSON string service account, atau simpan file di `config/firebase-service-account.json` (jangan commit)
* `FIREBASE_RTDB_URL` (opsional) — contoh: `https://aplikasi-kasir-21236-default-rtdb.asia-southeast1.firebasedatabase.app`

**Contoh set env sementara saat menjalankan migrasi/server:**

```bash
FIREBASE_RTDB_URL='https://aplikasi-kasir-21236-default-rtdb.asia-southeast1.firebasedatabase.app' node scripts/migrate-to-firebase.js
FIREBASE_RTDB_URL='https://aplikasi-kasir-21236-default-rtdb.asia-southeast1.firebasedatabase.app' npm start
```

3. **Opsional: Simpan service account ke file lokal**

```bash
mkdir -p config
cat > config/firebase-service-account.json <<'JSON'
{ ...service account JSON... }
JSON
```

Pastikan file ini ditambahkan di `.gitignore`.

---

## Migrasi Data `databarang` ke Firebase RTDB

```bash
# Pastikan env FIREBASE_RTDB_URL benar dan file service account ada / FIREBASE_SERVICE_ACCOUNT diset
node scripts/migrate-to-firebase.js
```

Skrip ini menulis semua dokumen `databarang` ke `/barang/{mongoId}` di RTDB.

---

## API Penting (Ringkasan)

| Method | Endpoint                  | Deskripsi                                  |
| ------ | ------------------------- | ------------------------------------------ |
| GET    | /api/barang               | List semua barang (stok merged dari RTDB)  |
| POST   | /api/barang               | Buat barang baru & tulis stok awal ke RTDB |
| PUT    | /api/barang/:id           | Update barang & sync ke RTDB               |
| DELETE | /api/barang/:id           | Hapus barang dari DB & RTDB                |
| POST   | /api/barang/:id/decrement | Kurangi stok atomically di RTDB            |

**Admin endpoints:**

* GET /api/admin/stok-barang — ambil daftar stok untuk dashboard admin

---

## Realtime di Frontend

* **Socket.IO:** server mem-broadcast event `stockUpdated` setiap kali stok berubah. Payload: `{ id, stok }`.
* **Firebase client SDK:** frontend dapat subscribe langsung ke RTDB path `/barang`.

**Contoh Socket.IO client:**

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000');
socket.on('stockUpdated', ({ id, stok }) => {
   // update UI
});
```

---

## Debugging & Tips

* Pastikan `FIREBASE_RTDB_URL` mengarah ke URL RTDB regional Anda.
* Jika stok tidak berubah di UI tanpa reload, pastikan frontend terhubung ke Socket.IO atau RTDB client.
* Network access ke Firebase harus diizinkan (port 443).

---

## Keamanan

* Jangan commit `config/firebase-service-account.json` ke git.
* Jika key ter-expose, revoke dan generate key baru di Firebase Console: [Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup#initialize-sdk).

---

## Opsional / Tambahan

* Demo frontend static (HTML + Socket.IO client) untuk verifikasi cepat.
* Unit tests untuk endpoint `decrement`.

---

copyright Aplikasi-Kasir 2025©
