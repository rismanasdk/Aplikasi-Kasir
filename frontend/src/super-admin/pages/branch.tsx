// src/admin/branch/branch.tsx
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SweetAlert from '../../components/SweetAlert';
import BranchModal from './component-branch/branchmodal';
import BranchTable from './component-branch/branchtabel';
import type { BranchFilterState } from './component-branch/branchfilter';
import Pagination from './component-branch/pagination';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import BranchFilter from './component-branch/branchfilter';

const API_KEY = import.meta.env.VITE_API_KEY;

export interface Branch {
  _id: string;
  nama?: string;
  alamat?: string;
  telepon?: string;
  status?: 'aktif' | 'nonaktif';
  keterangan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BranchFormData {
  nama: string;
  alamat: string;
  telepon: string;
  status: 'aktif' | 'nonaktif';
  keterangan: string;
}

export interface BranchPayload {
  nama: string;
  alamat: string;
  telepon: string;
  status: 'aktif' | 'nonaktif';
  keterangan?: string;
}

const BranchPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [filters, setFilters] = useState<BranchFilterState>({
    search: '',
    status: ''
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const API_URL_BRANCH = `${API_URL}/api/super-admin/cabang`;

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    }
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  // Apply filters locally (search by nama, filter by status)
  const applyFilters = useCallback((list: Branch[], f: BranchFilterState) => {
    let result = [...list];

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      result = result.filter(b =>
        (b.nama || '').toLowerCase().includes(q) ||
        (b.alamat || '').toLowerCase().includes(q) ||
        (b.telepon || '').toLowerCase().includes(q)
      );
    }

    if (f.status) {
      result = result.filter(b => b.status === f.status);
    }

    setFilteredBranches(result);
    setCurrentPage(1);
  }, []);

  // Fetch all branches
  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL_BRANCH, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil data cabang');
      }
      const data = await response.json();

      // Backend: res.json(branch) -> array langsung
      const fetched: Branch[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setBranches(fetched);
      applyFilters(fetched, filters);
    } catch (error) {
      SweetAlert.error('Gagal memuat data cabang');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters, API_URL_BRANCH, applyFilters]);

  // Handle filter change
  const handleFilter = (newFilters: BranchFilterState) => {
    setFilters(newFilters);
    applyFilters(branches, newFilters);
  };

  // Reset filters
  const handleResetFilter = () => {
    setFilters({ search: '', status: '' });
    setFilteredBranches(branches);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Submit form (create or update)
  const handleSubmit = async (formData: BranchFormData) => {
    try {
      SweetAlert.loading(editingBranch ? 'Mengupdate cabang...' : 'Menambah cabang...');

      const payload: BranchPayload = {
        nama: formData.nama,
        alamat: formData.alamat,
        telepon: formData.telepon,
        status: formData.status
      };

      if (formData.keterangan) {
        payload.keterangan = formData.keterangan;
      }

      let response;
      if (editingBranch) {
        response = await fetch(`${API_URL_BRANCH}/${editingBranch._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_URL_BRANCH}`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || (editingBranch ? 'Gagal mengupdate cabang' : 'Gagal menambah cabang'));
      }

      SweetAlert.success(editingBranch ? 'Cabang berhasil diupdate' : 'Cabang berhasil ditambahkan');
      fetchBranches();
      setShowModal(false);
      setEditingBranch(null);
    } catch (error) {
      SweetAlert.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
      console.error(error);
    } finally {
      SweetAlert.close();
    }
  };

  // Delete branch
  const handleDelete = async (id: string) => {
    const result = await SweetAlert.confirmDelete();

    if (result.isConfirmed) {
      try {
        SweetAlert.loading('Menghapus cabang...');

        const response = await fetch(`${API_URL_BRANCH}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.message || 'Gagal menghapus cabang');
        }

        SweetAlert.success('Cabang berhasil dihapus');
        fetchBranches();
      } catch (error) {
        SweetAlert.error(error instanceof Error ? error.message : 'Gagal menghapus cabang');
        console.error(error);
      } finally {
        SweetAlert.close();
      }
    }
  };

  // Edit branch
  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setShowModal(true);
  };

  // Add new branch
  const handleAddBranch = () => {
    setEditingBranch(null);
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBranches.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Cabang</h1>
        <button
          onClick={handleAddBranch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah Cabang
        </button>
      </div>

      <BranchFilter
        filters={filters}
        onFilter={handleFilter}
        onReset={handleResetFilter}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <BranchTable
            branches={currentItems}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {filteredBranches.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredBranches.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      <BranchModal
        showModal={showModal}
        editingBranch={editingBranch}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default BranchPage;