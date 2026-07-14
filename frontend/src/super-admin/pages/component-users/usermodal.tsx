// src/admin/users/component/usermodal.tsx
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../../config/api';
import { getStoredToken, getStoredUser } from '../../../auth/storage';

const API_KEY = import.meta.env.VITE_API_KEY;

interface User {
  _id: string;
  nama_lengkap?: string;
  nama?: string;
  username?: string;
  role: string;
  status: string;
  umur?: number;
  alamat?: string;
  password?: string;
  branch_id?: { _id?: string; nama?: string } | string | null;
}

interface FormData {
  nama_lengkap: string;
  username: string;
  password: string;
  role: string;
  status: string;
  umur: string;
  alamat: string;
  branch_id: string;
}

interface BranchOption {
  _id: string;
  nama?: string;
  status?: string;
}

interface UserModalProps {
  showModal: boolean;
  editingUser: User | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

const UserModal: React.FC<UserModalProps> = ({ showModal, editingUser, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    nama_lengkap: '',
    username: '',
    password: '',
    role: 'kasir',
    status: 'aktif',
    umur: '',
    alamat: '',
    branch_id: ''
  });
  
  // State untuk mengontrol apakah password sedang diedit
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  const currentUser = getStoredUser<{ role?: string }>();
  const isCurrentSuperAdmin = (currentUser?.role || '').toLowerCase() === 'super-admin';

  useEffect(() => {
    if (!showModal) return;

    const fetchBranches = async () => {
      try {
        setIsLoadingBranches(true);
        setBranchError(null);
        const token = getStoredToken();
        if (!token) {
          throw new Error('Sesi login tidak ditemukan.');
        }

        const response = await fetch(`${API_URL}/api/super-admin/cabang`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Gagal memuat daftar cabang');
        }

        const data = await response.json();
        const fetchedBranches = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];

        setBranches(fetchedBranches);
      } catch (error) {
        console.error(error);
        setBranchError('Gagal memuat daftar cabang');
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [showModal]);

  useEffect(() => {
    const getBranchIdValue = (branchId?: { _id?: string; nama?: string } | string | null) => {
      if (!branchId) return '';
      if (typeof branchId === 'string') return branchId;
      return branchId._id || '';
    };

    if (editingUser) {
      setFormData({
        nama_lengkap: editingUser.nama_lengkap || editingUser.nama || '',
        username: editingUser.username || '',
        password: '********', // Password masked
        role: editingUser.role,
        status: editingUser.status,
        umur: editingUser.umur?.toString() || '',
        alamat: editingUser.alamat || '',
        branch_id: getBranchIdValue(editingUser.branch_id)
      });
      setIsEditingPassword(false); // Reset password editing state
    } else {
      setFormData({
        nama_lengkap: '',
        username: '',
        password: '',
        role: 'kasir',
        status: 'aktif',
        umur: '',
        alamat: '',
        branch_id: ''
      });
      setIsEditingPassword(true); // Enable password editing for new user
    }
    setBranchError(null);
  }, [editingUser, showModal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'role' && (value === 'super-admin' || value === 'super_admin' || value === 'user')) {
        return {
          ...prev,
          role: value,
          branch_id: ''
        };
      }

      return {
        ...prev,
        [name]: value
      };
    });

    if (branchError) {
      setBranchError(null);
    }
  };

  const handleEditPassword = () => {
    setIsEditingPassword(true);
    setFormData({
      ...formData,
      password: '' // Clear password field when editing
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedRole = formData.role.trim().toLowerCase();
    const shouldRequireBranch = normalizedRole !== 'user' && normalizedRole !== 'super-admin' && normalizedRole !== 'super_admin';

    if (shouldRequireBranch && !formData.branch_id) {
      setBranchError('Cabang wajib dipilih untuk role ini');
      return;
    }

    setBranchError(null);
    await onSubmit({
      ...formData,
      role: normalizedRole
    });
  };

  

  if (!showModal) return null;

  const shouldShowBranchField = !isCurrentSuperAdmin && formData.role !== 'user' && formData.role !== 'super-admin' && formData.role !== 'super_admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">
            {editingUser ? 'Edit User' : 'Tambah User Baru'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              name="nama_lengkap"
              value={formData.nama_lengkap}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="flex space-x-2">
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                readOnly={!isEditingPassword}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  !isEditingPassword ? 'bg-gray-100' : ''
                }`}
                required={!editingUser || isEditingPassword}
              />
              {editingUser && !isEditingPassword && (
                <button
                  type="button"
                  onClick={handleEditPassword}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Ubah
                </button>
              )}
            </div>
            {editingUser && !isEditingPassword && (
              <p className="text-xs text-gray-500 mt-1">Klik tombol "Ubah" untuk mengubah password</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="kasir">Kasir</option>
                <option value="manajer">Manajer</option>
                <option value="chef">Chef</option>
                <option value="security">Security</option>
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </select>
            </div>
            
            {editingUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            )}
          </div>
          
          {shouldShowBranchField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cabang</label>
              {isLoadingBranches ? (
                <div className="text-sm text-gray-500">Memuat daftar cabang...</div>
              ) : (
                <>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih cabang</option>
                    {branches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.nama || 'Cabang'}
                      </option>
                    ))}
                  </select>
                  {branchError && <p className="text-xs text-red-600 mt-1">{branchError}</p>}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {editingUser ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;