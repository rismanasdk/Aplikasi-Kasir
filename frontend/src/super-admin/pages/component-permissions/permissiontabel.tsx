// src/admin/permission/component-permissions/permissiontabel.tsx
import React from 'react';
import type { ModulGroup } from '../permissions';

interface PermissionTableProps {
  groups: ModulGroup[];
  onViewPermissions: (group: ModulGroup) => void;
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

const MODUL_ICON: Record<string, string> = {
  bi: '📊',
  branch: '🏢',
  dashboard: '📈',
  employee: '👥',
  forecast: '🔮',
  permission: '🔒',
  product: '📦',
  report: '📋',
  role: '🎭',
  security: '🛡️',
  stock: '🏷️',
  transaction: '💰',
  user: '👤',
};

const PermissionTable: React.FC<PermissionTableProps> = ({ groups, onViewPermissions }) => {
  if (groups.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-16 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-sm">Tidak ada data yang ditemukan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-[8%]">#</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Nama Modul</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Deskripsi</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600 w-[16%]">Jumlah Permission</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600 w-[14%]">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {groups.map((group, idx) => {
            const label = MODUL_LABEL[group.modul] || group.modul;
            const icon = MODUL_ICON[group.modul] || '📁';
            const count = group.items.length;

            // Ambil deskripsi dari item pertama sebagai preview
            const previewDeskripsi = group.items[0]?.deskripsi || '-';

            return (
              <tr key={group.modul} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{icon}</span>
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{label}</p>
                      <code className="text-[11px] text-gray-400">{group.modul}</code>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                  {previewDeskripsi}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-xs font-semibold rounded-full w-8 h-8">
                    {count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onViewPermissions(group)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionTable;