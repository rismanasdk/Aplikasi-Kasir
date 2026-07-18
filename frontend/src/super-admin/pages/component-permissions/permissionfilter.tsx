import React from 'react';

export interface PermissionFilterState {
  search: string;
  modul: string;
}

interface PermissionFilterProps {
  filters: PermissionFilterState;
  modulOptions: string[];
  onFilter: (newFilters: PermissionFilterState) => void;
  onReset: () => void;
}

const PermissionFilter: React.FC<PermissionFilterProps> = ({
  filters,
  modulOptions,
  onFilter,
}) => {
  const handleChange = (field: keyof PermissionFilterState, value: string) => {
    onFilter({ ...filters, [field]: value });
  };

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Cari</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Cari nama, deskripsi, atau tipe"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tipe</label>
          <select
            value={filters.modul}
            onChange={(e) => handleChange('modul', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Tipe</option>
            {modulOptions.map((modul) => (
              <option key={modul} value={modul}>
                {modul}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PermissionFilter;
