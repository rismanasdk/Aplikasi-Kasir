# Frontend Kasir Plus

Frontend ini dibangun dengan `React`, `TypeScript`, dan `Vite`. UI dipakai untuk dashboard publik user, admin, manajer, kasir, dan chef.

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Konfigurasi

Gunakan environment berikut:

```env
VITE_API_URL=http://localhost:5000
VITE_API_KEY=
```

## Folder Penting

- `src/pages/` halaman user / publik
- `src/admin/` halaman admin
- `src/meneger/` halaman manajer
- `src/kasir/` halaman kasir
- `src/chef/` halaman chef
- `src/auth/` context auth, guard route, login, register
- `src/components/` layout dan komponen umum
- `src/config/api.ts` base URL backend

## Catatan

- Route protection frontend ada di `src/auth/ProtectedRoute.tsx`, `src/auth/AuthGuard.tsx`, dan `src/auth/DashboardRedirect.tsx`.
- Beberapa file auth masih bersifat legacy / duplikat dan sebaiknya dirapikan bertahap.
