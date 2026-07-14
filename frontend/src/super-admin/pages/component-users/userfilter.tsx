// src/admin/users/component/userfilter.tsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';

const API_KEY = import.meta.env.VITE_API_KEY;

interface Branch {
  id: string;
  name: string;
}

// Tipe untuk response raw dari API
interface RawBranch {
  _id?: string;
  id?: string;
  nama?: string;
  name?: string;
}

interface UserFilterProps {
  onFilter: (filters: { role: string; status: string; branch: string }) => void;
  onReset: () => void;
}

// Tipe untuk response API yang bisa berupa array langsung atau nested di data
interface ApiResponse {
  data?: RawBranch[];
}

const isRawBranchArray = (value: unknown): value is RawBranch[] => {
  return Array.isArray(value);
};

const UserFilter: React.FC<UserFilterProps> = ({ onFilter, onReset }) => {
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    branch: ''
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const token = getStoredToken();
        const response = await fetch(`${API_URL}/api/super-admin/cabang`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
          },
        });
        if (!response.ok) throw new Error('Failed to fetch branches');
        const data: ApiResponse | RawBranch[] = await response.json();
        
        const rawBranches = isRawBranchArray(data) 
          ? data 
          : isRawBranchArray((data as ApiResponse).data) 
            ? (data as ApiResponse).data! 
            : [];

        const normalizedBranches: Branch[] = rawBranches.map((branch) => ({
          id: String(branch._id || branch.id || ''),
          name: branch.nama || branch.name || 'Cabang'
        }));
        
        setBranches(normalizedBranches);
      } catch (error) {
        console.error('Error fetching branches:', error);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newFilters = {
      ...filters,
      [name]: value
    };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const handleReset = () => {
    setFilters({
      role: '',
      status: '',
      branch: ''
    });
    onReset();
  };

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : branchId;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Role</label>
          <div className="relative">
            <select
              name="role"
              value={filters.role}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">Semua Role</option>
              <option value="kasir">Kasir</option>
              <option value="manajer">Manajer</option>
              <option value="chef">Chef</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
          <div className="relative">
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Cabang</label>
          <div className="relative">
            <select
              name="branch"
              value={filters.branch}
              onChange={handleFilterChange}
              disabled={loadingBranches}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">
                {loadingBranches ? 'Memuat cabang...' : 'Semua Cabang'}
              </option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
        </div>
      </div>
      
      {(filters.role || filters.status || filters.branch) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.role && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Role: {filters.role}
              <button
                type="button"
                onClick={() => {
                  const newFilters = { ...filters, role: '' };
                  setFilters(newFilters);
                  onFilter(newFilters);
                }}
                className="ml-2 text-blue-600 hover:text-blue-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Status: {filters.status}
              <button
                type="button"
                onClick={() => {
                  const newFilters = { ...filters, status: '' };
                  setFilters(newFilters);
                  onFilter(newFilters);
                }}
                className="ml-2 text-green-600 hover:text-green-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {filters.branch && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Cabang: {getBranchName(filters.branch)}
              <button
                type="button"
                onClick={() => {
                  const newFilters = { ...filters, branch: '' };
                  setFilters(newFilters);
                  onFilter(newFilters);
                }}
                className="ml-2 text-purple-600 hover:text-purple-900"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default UserFilter;