// src/admin/permission/component-permissions/permissiondetailmodal.tsx
import React, { useMemo, useState } from 'react';
import type { PermissionItem, RoleGroup } from '../permissions.tsx';

interface PermissionDetailModalProps {
  showModal: boolean;
  role: RoleGroup | null;
  permissions: PermissionItem[];
  rolePermissions: PermissionItem[];
  loading: boolean;
  onClose: () => void;
}

const getStatusClass = (status?: string) => {
  if (status === 'nonaktif' || status === 'inactive' || status === 'nonactive') {
    return 'bg-red-50 text-red-700';
  }
  return 'bg-green-50 text-green-700';
};

const getTypeClass = (type?: string) => {
  if (type === 'pusat') return 'bg-purple-50 text-purple-700';
  if (type === 'cabang') return 'bg-blue-50 text-blue-700';
  return 'bg-gray-50 text-gray-700';
};

const PermissionDetailModal: React.FC<PermissionDetailModalProps> = ({
  showModal,
  role,
  permissions,
  rolePermissions,
  loading,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  const assignedPermissionIds = useMemo(() => new Set(rolePermissions.map((permission) => permission._id)), [rolePermissions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return permissions;
    const q = search.trim().toLowerCase();
    return permissions.filter((permission) => {
      return (
        (permission.code || '').toLowerCase().includes(q) ||
        (permission.nama || '').toLowerCase().includes(q) ||
        (permission.deskripsi || '').toLowerCase().includes(q) ||
        (permission.modul || '').toLowerCase().includes(q)
      );
    });
  }, [permissions, search]);

  if (!showModal || !role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl max-h-[85vh] rounded-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Detail Role: {role.nama}</h2>
            <p className="text-sm text-gray-500 mt-1">{role.deskripsi || 'Tidak ada deskripsi'}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClass(role.status)}`}>
                Status: {role.status || 'aktif'}
              </span>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getTypeClass(role.tipe)}`}>
                Tipe: {role.tipe || 'cabang'}
              </span>
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {rolePermissions.length} permission
              </span>
            </div>
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

        <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="relative max-w-xs flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari permission..."
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-500">Memuat daftar permission...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">
              {search ? 'Tidak ada permission yang cocok' : 'Belum ada permission tersedia'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Modul</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((permission) => {
                  const isAssigned = assignedPermissionIds.has(permission._id);

                  return (
                    <tr key={permission._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{permission.code}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-700">{permission.nama}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{permission.deskripsi || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{permission.modul || '-'}</td>
                      <td className="px-4 py-2.5 text-xs">
                        <span className={`inline-flex rounded-full px-2.5 py-1 font-medium ${isAssigned ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {isAssigned ? 'Terhubung' : 'Tersedia'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionDetailModal;