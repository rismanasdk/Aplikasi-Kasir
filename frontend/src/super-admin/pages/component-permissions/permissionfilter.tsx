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
  onReset,
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
            placeholder="Cari kode, nama, atau modul"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Modul</label>
          <select
            value={filters.modul}
            onChange={(e) => handleChange('modul', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Modul</option>
            {modulOptions.map((modul) => (
              <option key={modul} value={modul}>
                {modul}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
};

export default PermissionFilter;
