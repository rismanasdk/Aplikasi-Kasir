// src/admin/users/component/usermodal.tsx
import React, { useState, useEffect } from 'react';

interface User {
  _id: string;
  nama_lengkap?: string;
  nama?: string;
  username?: string;
  role: string;
  status: string;
  umur?: number;  // Tambahkan ini
  alamat?: string; // Tambahkan ini
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
    alamat: ''
  });
  
  // State untuk mengontrol apakah password sedang diedit
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        nama_lengkap: editingUser.nama_lengkap || editingUser.nama || '',
        username: editingUser.username || '',
        password: '********', // Password masked
        role: editingUser.role,
        status: editingUser.status,
        umur: editingUser.umur?.toString() || '',
        alamat: editingUser.alamat || ''
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
        alamat: ''
      });
      setIsEditingPassword(true); // Enable password editing for new user
    }
  }, [editingUser, showModal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
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
    
    await onSubmit(formData);
  };

  

  if (!showModal) return null;

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