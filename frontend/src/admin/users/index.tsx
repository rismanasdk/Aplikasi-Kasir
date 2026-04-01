// src/admin/users/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SweetAlert from '../../components/SweetAlert';
import UserModal from './component/usermodal';
import UserTable from './component/usertable';
import UserFilter from './component/userfilter';
import { ChevronLeft, ChevronRight } from 'lucide-react'; // Tambahkan import ini
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
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
}

interface FormData {
  nama_lengkap: string;
  username: string;
  password: string;
  role: string;
  status: string;
  umur: string;
  alamat: string;
}

interface UserPayload {
  nama_lengkap: string;
  username: string;
  role: string;
  status: string;
  password?: string;
  umur?: number;
  alamat?: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  const API_URL_USERS = `${API_URL}/api/admin/users`;

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL_USERS, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil data user');
      }
      const data = await response.json();
      // Filter out users with role 'user'
      const filteredData = data.filter((user: User) => user.role !== 'user');
      setUsers(filteredData);
      applyFilters(filteredData, filters);
      // Reset to first page when fetching new data
      setCurrentPage(1);
    } catch (error) {
      SweetAlert.error('Gagal memuat data user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filters, API_URL_USERS]);

  // Apply filters to users
  const applyFilters = (userList: User[], currentFilters: { role: string; status: string }) => {
    let result = [...userList];
    
    if (currentFilters.role) {
      result = result.filter(user => user.role === currentFilters.role);
    }
    
    if (currentFilters.status) {
      result = result.filter(user => user.status === currentFilters.status);
    }
    
    setFilteredUsers(result);
    // Reset to first page when applying filters
    setCurrentPage(1);
  };

  // Handle filter change
  const handleFilter = (newFilters: { role: string; status: string }) => {
    setFilters(newFilters);
    applyFilters(users, newFilters);
  };

  // Reset filters
  const handleResetFilter = () => {
    setFilters({ role: '', status: '' });
    setFilteredUsers(users);
    // Reset to first page when resetting filters
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Submit form (create or update user)
  const handleSubmit = async (formData: FormData) => {
    try {
      SweetAlert.loading(editingUser ? 'Mengupdate user...' : 'Menambah user...');
      
      // Buat payload dasar
      const payload: UserPayload = {
        nama_lengkap: formData.nama_lengkap,
        username: formData.username,
        role: formData.role,
        status: formData.status
      };

      // Tambahkan umur jika ada
      if (formData.umur) {
        payload.umur = parseInt(formData.umur);
      }

      // Tambahkan alamat jika ada
      if (formData.alamat) {
        payload.alamat = formData.alamat;
      }

      // Hanya tambahkan password jika tidak kosong dan bukan string mask '********'
      if (formData.password && formData.password.trim() !== "" && formData.password !== '********') {
        payload.password = formData.password;
      }

      let response;
      if (editingUser) {
        // Update existing user
        response = await fetch(`${API_URL_USERS}/${editingUser._id}`, {
          method: 'PUT',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      } else {
        // Create new user
        response = await fetch(`${API_URL_USERS}/create`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        throw new Error(editingUser ? 'Gagal mengupdate user' : 'Gagal menambah user');
      }

      SweetAlert.success(editingUser ? 'User berhasil diupdate' : 'User berhasil ditambahkan');
      fetchUsers();
      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      SweetAlert.error(editingUser ? 'Gagal mengupdate user' : 'Gagal menambah user');
      console.error(error);
    } finally {
      SweetAlert.close();
    }
  };

  // Delete user
  const handleDelete = async (id: string) => {
    const result = await SweetAlert.confirmDelete();
    
    if (result.isConfirmed) {
      try {
        SweetAlert.loading('Menghapus user...');
        
        const response = await fetch(`${API_URL_USERS}/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Gagal menghapus user');
        }

        SweetAlert.success('User berhasil dihapus');
        fetchUsers();
      } catch (error) {
        SweetAlert.error('Gagal menghapus user');
        console.error(error);
      } finally {
        SweetAlert.close();
      }
    }
  };

  // Edit user
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  // Add new user
  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Handle page change
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen User</h1>
        <button
          onClick={handleAddUser}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Tambah User
        </button>
      </div>

      <UserFilter onFilter={handleFilter} onReset={handleResetFilter} />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <UserTable 
            users={currentItems} 
            onEdit={handleEdit} 
            onDelete={handleDelete} 
          />
          
          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)}</span> dari{' '}
                <span className="font-semibold text-gray-900">{filteredUsers.length}</span> user
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium transition-all ${
                          currentPage === pageNum 
                            ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
                  }`}
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <UserModal 
        showModal={showModal}
        editingUser={editingUser}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default UsersPage;
