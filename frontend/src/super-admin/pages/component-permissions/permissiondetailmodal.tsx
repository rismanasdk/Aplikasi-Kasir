// src/admin/permission/component-permissions/permissiondetailmodal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import type { ModulGroup, PermissionItem } from '../permissions';

interface PermissionDetailModalProps {
  showModal: boolean;
  modulGroup: ModulGroup | null;
  onClose: () => void;
  onAddPermission: (modul: string) => void;
  onEditPermission: (permission: PermissionItem) => void;
  onDeletePermission: (id: string) => void;
}

const MODUL_LABEL: Record<string, string> = {
  bi: 'Business Intelligence',
  branch: 'Cabang',
  dashboard: 'Dashboard',
  employee: 'Karyawan',
  forecast: 'Forecast',
  permission: 'Permission',
  product: 'Produk',
  report: 'Laporan',
  role: 'Role',
  security: 'Keamanan',
  stock: 'Stok',
  transaction: 'Transaksi',
  user: 'User',
  lainnya: 'Lainnya',
};

const MODUL_COLOR: Record<string, string> = {
  bi: 'bg-violet-100 text-violet-700',
  branch: 'bg-blue-100 text-blue-700',
  dashboard: 'bg-indigo-100 text-indigo-700',
  employee: 'bg-pink-100 text-pink-700',
  forecast: 'bg-orange-100 text-orange-700',
  permission: 'bg-gray-100 text-gray-700',
  product: 'bg-emerald-100 text-emerald-700',
  report: 'bg-cyan-100 text-cyan-700',
  role: 'bg-purple-100 text-purple-700',
  security: 'bg-rose-100 text-rose-700',
  stock: 'bg-amber-100 text-amber-700',
  transaction: 'bg-yellow-100 text-yellow-700',
  user: 'bg-sky-100 text-sky-700',
};

const PER_PAGE = 10;

const PermissionDetailModal: React.FC<PermissionDetailModalProps> = ({
  showModal,
  modulGroup,
  onClose,
  onAddPermission,
  onEditPermission,
  onDeletePermission,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSearch('');
    setPage(1);
  }, [modulGroup?.modul]);

  const filtered = useMemo(() => {
    if (!modulGroup?.items) return [];
    if (!search.trim()) return modulGroup.items;
    const q = search.trim().toLowerCase();
    return modulGroup.items.filter(
      (p) =>
        (p.code || '').toLowerCase().includes(q) ||
        (p.nama || '').toLowerCase().includes(q) ||
        (p.deskripsi || '').toLowerCase().includes(q)
    );
  }, [modulGroup, search]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const lastIdx = page * PER_PAGE;
  const firstIdx = lastIdx - PER_PAGE;
  const items = filtered.slice(firstIdx, lastIdx);

  if (!showModal || !modulGroup) return null;

  const label = MODUL_LABEL[modulGroup.modul] || modulGroup.modul;
  const colorClass = MODUL_COLOR[modulGroup.modul] || 'bg-gray-100 text-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-lg bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Permissions —{' '}
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${colorClass}`}>
                {label}
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              <code>{modulGroup.modul}</code> &middot; {modulGroup.items.length} permission
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari permission..."
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => onAddPermission(modulGroup.modul)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Permission
          </button>
        </div>

        {/* Tabel */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-sm">
                {search ? 'Tidak ada permission yang cocok' : 'Belum ada permission di modul ini'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[8%]">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((perm, idx) => (
                  <tr key={perm._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-gray-400">{firstIdx + idx + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{perm.code}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{perm.nama}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[240px] truncate">{perm.deskripsi || '-'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => onEditPermission(perm)}
                        className="rounded-md bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDeletePermission(perm._id)}
                        className="rounded-md bg-white border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 shrink-0 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Menampilkan {firstIdx + 1}-{Math.min(lastIdx, filtered.length)} dari {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded px-2.5 py-1 text-xs transition-colors ${p === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionDetailModal;