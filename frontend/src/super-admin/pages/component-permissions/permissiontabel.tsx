// src/admin/permission/component-permissions/permissiontabel.tsx
import React from 'react';
import type { RoleGroup } from '../permissions';

interface PermissionTableProps {
  roles: RoleGroup[];
  onViewPermissions: (role: RoleGroup) => void;
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

const PermissionTable: React.FC<PermissionTableProps> = ({ roles, onViewPermissions }) => {
  if (roles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 py-16 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-500 text-sm">Tidak ada data role yang ditemukan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600 w-[6%]">#</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Nama Role</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Deskripsi</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipe</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-600 w-[18%]">Jumlah Permission</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {roles.map((role, idx) => (
            <tr key={role._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
              <td className="px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-800">{role.nama}</p>
                  <p className="text-[11px] text-gray-400">{role.code}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{role.deskripsi || '-'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(role.status)}`}>
                  {role.status || 'aktif'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getTypeClass(role.tipe)}`}>
                  {role.tipe || 'cabang'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onViewPermissions(role)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View ({role.permissions.length})
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionTable;