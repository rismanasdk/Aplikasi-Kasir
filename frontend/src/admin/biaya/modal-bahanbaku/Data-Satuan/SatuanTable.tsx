// src/admin/bahan-baku/Data-Satuan/SatuanTable.tsx
import React from 'react';
import type { DataSatuanItem } from './SatuanTabs';
import { CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';

interface Props {
  loading: boolean;
  data: DataSatuanItem[];
  onEdit: (item: DataSatuanItem) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus: boolean) => void;
}

const SatuanTable: React.FC<Props> = ({ loading, data, onEdit, onDelete, onToggleStatus }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        Tidak ada data satuan.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Satuan</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deskripsi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((d, index) => (
            <tr key={d._id || index} 
                className={`transition-colors hover:bg-gray-50 ${
                index % 2 === 0 ? 'bg-white' : 'bg-amber-50'
                }`}
              >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.nama}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.kode}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className="capitalize">{d.tipe}</span></td>
              <td className="px-6 py-4 text-sm text-gray-500">{d.deskripsi || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button onClick={() => onToggleStatus(d._id, !d.isActive)} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium focus:outline-none" title="Toggle status">
                  {d.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-4 h-4 mr-1" />Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <XCircle className="w-4 h-4 mr-1" />Nonaktif
                    </span>
                  )}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(d)} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit className="inline-block" /></button>
                  <button onClick={() => onDelete(d._id)} className="text-red-600 hover:text-red-800" title="Hapus"><Trash2 className="inline-block" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SatuanTable;