// src/admin/permission/permissions.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SweetAlert from '../../components/SweetAlert';
import PermissionModal from './component-permissions/permissionmodal';
import PermissionDetailModal from './component-permissions/permissiondetailmodal';
import PermissionTable from './component-permissions/permissiontabel';
import type { PermissionFilterState } from './component-permissions/permissionfilter';
import Pagination from './component-permissions/pagination';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import PermissionFilter from './component-permissions/permissionfilter';

const API_KEY = import.meta.env.VITE_API_KEY;

// ── Types sesuai data API yang sebenarnya ───────────────────────────
export interface PermissionItem {
  _id: string;
  code: string;
  nama: string;
  deskripsi?: string;
  modul?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ModulGroup {
  modul: string;
  items: PermissionItem[];
}

export type Permission = PermissionItem;

export interface PermissionFormData {
  code: string;
  nama: string;
  deskripsi: string;
  modul: string;
}

export interface PermissionPayload {
  code: string;
  nama: string;
  modul: string;
  deskripsi?: string;
}

// ── Component ───────────────────────────────────────────────────────
const PermissionPage: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<ModulGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedModul, setSelectedModul] = useState<ModulGroup | null>(null);

  // Form modal
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingPermission, setEditingPermission] = useState<PermissionItem | null>(null);
  const [preSelectedModul, setPreSelectedModul] = useState<string | null>(null);

  // Filter
  const [filters, setFilters] = useState<PermissionFilterState>({
    search: '',
    modul: '',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const API_URL_PERMISSION = `${API_URL}/api/super-admin/permission`;

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  // ── Grouping: flat array → grouped by modul ───────────────────────
  const allGroups = useMemo(() => {
    const map = new Map<string, PermissionItem[]>();
    permissions.forEach((p) => {
      const key = p.modul || 'lainnya';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    // Sort items di dalam setiap group by code
    const groups: ModulGroup[] = [];
    map.forEach((items, modul) => {
      groups.push({ modul, items: items.sort((a, b) => a.code.localeCompare(b.code)) });
    });
    // Sort group by modul name
    return groups.sort((a, b) => a.modul.localeCompare(b.modul));
  }, [permissions]);

  // ── Opsi dropdown filter modul ────────────────────────────────────
  const modulOptions = useMemo(
    () => allGroups.map((g) => g.modul),
    [allGroups]
  );

  // ── Filter ────────────────────────────────────────────────────────
  const applyFilters = useCallback((groups: ModulGroup[], f: PermissionFilterState) => {
    let result = [...groups];

    if (f.modul) {
      result = result.filter((g) => g.modul === f.modul);
    }

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      result = result.filter((g) => {
        // Cari di nama modul
        if (g.modul.toLowerCase().includes(q)) return true;
        // Cari di item permission
        return g.items.some(
          (item) =>
            (item.code || '').toLowerCase().includes(q) ||
            (item.nama || '').toLowerCase().includes(q) ||
            (item.deskripsi || '').toLowerCase().includes(q)
        );
      });
    }

    setFilteredGroups(result);
    setCurrentPage(1);
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL_PERMISSION, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Gagal mengambil data permission');

      const json = await response.json();
      const raw: PermissionItem[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];

      setPermissions(raw);
      applyFilters(
        // Group dulu langsung dari raw
        (() => {
          const map = new Map<string, PermissionItem[]>();
          raw.forEach((p) => {
            const key = p.modul || 'lainnya';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
          });
          const groups: ModulGroup[] = [];
          map.forEach((items, modul) => {
            groups.push({ modul, items: items.sort((a, b) => a.code.localeCompare(b.code)) });
          });
          return groups.sort((a, b) => a.modul.localeCompare(b.modul));
        })(),
        filters
      );
    } catch (error) {
      SweetAlert.error('Gagal memuat data permission');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [API_URL_PERMISSION, applyFilters, filters]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Re-apply filter saat allGroups berubah (setelah fetch)
  useEffect(() => {
    applyFilters(allGroups, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGroups]);

  // Sinkronkan selectedModul
  useEffect(() => {
    if (selectedModul && showDetailModal) {
      const updated = filteredGroups.find((g) => g.modul === selectedModul.modul);
      if (updated) setSelectedModul(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredGroups]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleFilter = (newFilters: PermissionFilterState) => {
    setFilters(newFilters);
    applyFilters(allGroups, newFilters);
  };

  const handleResetFilter = () => {
    setFilters({ search: '', modul: '' });
    setFilteredGroups(allGroups);
    setCurrentPage(1);
  };

  const handleViewPermissions = (group: ModulGroup) => {
    setSelectedModul(group);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedModul(null);
  };

  const handleAddPermission = (modul?: string) => {
    setEditingPermission(null);
    setPreSelectedModul(modul ?? null);
    setShowFormModal(true);
  };

  const handleEditPermission = (permission: PermissionItem) => {
    setEditingPermission(permission);
    setPreSelectedModul(permission.modul ?? null);
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingPermission(null);
    setPreSelectedModul(null);
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async (formData: PermissionFormData) => {
    try {
      SweetAlert.loading(editingPermission ? 'Mengupdate permission...' : 'Menambah permission...');

      const payload: PermissionPayload = {
        code: formData.code,
        nama: formData.nama,
        modul: formData.modul,
      };
      if (formData.deskripsi) payload.deskripsi = formData.deskripsi;

      let response;
      if (editingPermission) {
        response = await fetch(`${API_URL_PERMISSION}/${editingPermission._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(API_URL_PERMISSION, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData?.message ||
            (editingPermission ? 'Gagal mengupdate permission' : 'Gagal menambah permission')
        );
      }

      SweetAlert.success(
        editingPermission ? 'Permission berhasil diupdate' : 'Permission berhasil ditambahkan'
      );
      await fetchPermissions();
      handleCloseFormModal();
    } catch (error) {
      SweetAlert.error(error instanceof Error ? error.message : 'Terjadi kesalahan');
      console.error(error);
    } finally {
      SweetAlert.close();
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  const handleDeletePermission = async (id: string) => {
    const result = await SweetAlert.confirmDelete();
    if (!result.isConfirmed) return;

    try {
      SweetAlert.loading('Menghapus permission...');
      const response = await fetch(`${API_URL_PERMISSION}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || 'Gagal menghapus permission');
      }
      SweetAlert.success('Permission berhasil dihapus');
      await fetchPermissions();
    } catch (error) {
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal menghapus permission');
      console.error(error);
    } finally {
      SweetAlert.close();
    }
  };

  // ── Pagination ────────────────────────────────────────────────────
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentGroups = filteredGroups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Permission</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredGroups.length} modul &middot; {permissions.length} permission
          </p>
        </div>
        <button
          onClick={() => handleAddPermission()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah Permission
        </button>
      </div>

      <PermissionFilter
        filters={filters}
        modulOptions={modulOptions}
        onFilter={handleFilter}
        onReset={handleResetFilter}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <PermissionTable
            groups={currentGroups}
            onViewPermissions={handleViewPermissions}
          />

          {filteredGroups.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredGroups.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      <PermissionDetailModal
        showModal={showDetailModal}
        modulGroup={selectedModul}
        onClose={handleCloseDetailModal}
        onAddPermission={handleAddPermission}
        onEditPermission={handleEditPermission}
        onDeletePermission={handleDeletePermission}
      />

      <PermissionModal
        showModal={showFormModal}
        editingPermission={editingPermission}
        preSelectedModul={preSelectedModul}
        modulOptions={modulOptions}
        onClose={handleCloseFormModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default PermissionPage;