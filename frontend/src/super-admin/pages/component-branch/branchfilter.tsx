// src/admin/branch/component-branch/branchfilter.tsx
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface BranchFilterState {
  search: string;
  status: '' | 'aktif' | 'nonaktif';
}

interface BranchFilterProps {
  filters: BranchFilterState;
  onFilter: (filters: BranchFilterState) => void;
  onReset: () => void;
}

const BranchFilter: React.FC<BranchFilterProps> = ({ filters, onFilter, onReset }) => {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localStatus, setLocalStatus] = useState<BranchFilterState['status']>(filters.status);

  // Sync ketika parent reset
  useEffect(() => {
    setLocalSearch(filters.search);
    setLocalStatus(filters.status);
  }, [filters]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter({ search: localSearch, status: localStatus });
  };

  const handleReset = () => {
    setLocalSearch('');
    setLocalStatus('');
    onReset();
  };

  const hasActiveFilter = filters.search !== '' || filters.status !== '';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Cari nama, alamat, atau telepon..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <select
          value={localStatus}
          onChange={(e) => setLocalStatus(e.target.value as BranchFilterState['status'])}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
        >
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Filter
          </button>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default BranchFilter;