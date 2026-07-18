// src/admin/permission/permissions.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SweetAlert from '../../components/SweetAlert';
import PermissionDetailModal from './component-permissions/permissiondetailmodal';
import PermissionTable from './component-permissions/permissiontabel';
import type { PermissionFilterState } from './component-permissions/permissionfilter';
import Pagination from './component-permissions/pagination';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import PermissionFilter from './component-permissions/permissionfilter';

const API_KEY = import.meta.env.VITE_API_KEY;

export interface PermissionItem {
  _id: string;
  code: string;
  nama: string;
  deskripsi?: string;
  modul?: string;
  mode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoleItem {
  _id: string;
  code: string;
  nama: string;
  deskripsi?: string;
  tipe?: string;
  status?: string;
  permissions?: PermissionItem[];
  created_at?: string;
  updated_at?: string;
}

export interface RoleGroup {
  _id: string;
  code: string;
  nama: string;
  deskripsi?: string;
  tipe?: string;
  status?: string;
  permissions: PermissionItem[];
}

const PermissionPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<RoleGroup[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<RoleGroup | null>(null);

  const [filters, setFilters] = useState<PermissionFilterState>({
    search: '',
    modul: '',
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const API_URL_PERMISSION_ROLES = `${API_URL}/api/super-admin/permission/roles`;
  const API_URL_PERMISSION = `${API_URL}/api/super-admin/permission`;

  const getAuthHeaders = useCallback((json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  const normalizeRoles = useCallback((source: RoleItem[]): RoleGroup[] => {
    return source.map((role) => ({
      _id: role._id,
      code: role.code,
      nama: role.nama,
      deskripsi: role.deskripsi,
      tipe: role.tipe,
      status: role.status,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    }));
  }, []);

  const roleOptions = useMemo(() => {
    const unique = new Set<string>();
    roles.forEach((role) => {
      if (role.tipe) unique.add(role.tipe);
    });
    return Array.from(unique);
  }, [roles]);

  const applyFilters = useCallback((items: RoleGroup[], f: PermissionFilterState) => {
    let result = [...items];

    if (f.modul) {
      result = result.filter((role) => role.tipe?.toLowerCase() === f.modul.toLowerCase());
    }

    if (f.search.trim()) {
      const q = f.search.trim().toLowerCase();
      result = result.filter((role) => {
        return (
          (role.nama || '').toLowerCase().includes(q) ||
          (role.deskripsi || '').toLowerCase().includes(q) ||
          (role.code || '').toLowerCase().includes(q) ||
          (role.tipe || '').toLowerCase().includes(q)
        );
      });
    }

    setFilteredRoles(result);
    setCurrentPage(1);
  }, []);

  const fetchPermissionCatalog = useCallback(async () => {
    try {
      const response = await fetch(API_URL_PERMISSION, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Gagal mengambil data permission');

      const json = await response.json();
      const raw: PermissionItem[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];

      setPermissions(raw);
    } catch (error) {
      console.error(error);
    }
  }, [API_URL_PERMISSION, getAuthHeaders]);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL_PERMISSION_ROLES, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Gagal mengambil data role');

      const json = await response.json();
      const raw: RoleItem[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];

      setRoles(raw);
      applyFilters(normalizeRoles(raw), filters);
    } catch (error) {
      SweetAlert.error('Gagal memuat data role');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [API_URL_PERMISSION_ROLES, applyFilters, filters, normalizeRoles, getAuthHeaders]);

  useEffect(() => {
    void fetchPermissionCatalog();
  }, [fetchPermissionCatalog]);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    applyFilters(normalizeRoles(roles), filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles]);

  const handleFilter = (newFilters: PermissionFilterState) => {
    setFilters(newFilters);
    applyFilters(normalizeRoles(roles), newFilters);
  };

  const handleResetFilter = () => {
    setFilters({ search: '', modul: '' });
    setFilteredRoles(normalizeRoles(roles));
    setCurrentPage(1);
  };

  const handleViewPermissions = (role: RoleGroup) => {
    setSelectedRole(role);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRole(null);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Role & Permission</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredRoles.length} role &middot; {roles.length} role terdaftar
          </p>
        </div>
      </div>

      <PermissionFilter
        filters={filters}
        modulOptions={roleOptions}
        onFilter={handleFilter}
        onReset={handleResetFilter}
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <PermissionTable
            roles={currentRoles}
            onViewPermissions={handleViewPermissions}
          />

          {filteredRoles.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredRoles.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      <PermissionDetailModal
        showModal={showDetailModal}
        role={selectedRole}
        permissions={permissions}
        rolePermissions={selectedRole?.permissions ?? []}
        loading={false}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default PermissionPage;
