import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/hooks/useAuth';
import { FaCamera, FaSave, FaArrowLeft, FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import SweetAlert from '../../../components/SweetAlert';

interface User {
  id?: string;
  _id?: string;
  nama_lengkap: string;
  username?: string;
  role: 'admin' | 'manajer' | 'kasir' | 'user';
  status: string;
  profilePicture?: string;
}

interface UpdateProfileData {
  nama_lengkap: string;
  username: string;
  currentPassword?: string;
  newPassword?: string;
}

// Helper function untuk mendapatkan ID user
function getUserId(user: User | null): string {
  return user?._id || user?.id || '';
}

export default function ProfilePage() {
  const [form, setForm] = useState({
    nama_lengkap: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  // Inisialisasi data user dari auth context
  useEffect(() => {
    const initializeForm = async () => {
      try {
        setIsDataLoading(true);
        
        // Tunggu sebentar untuk memastikan auth context sudah terisi
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (auth.user) {
          setForm({
            nama_lengkap: auth.user.nama_lengkap || '',
            username: auth.user.username || '',
            currentPassword: '', // Password tidak pernah diisi dari server
            newPassword: '',      // untuk alasan keamanan
            confirmPassword: ''
          });
          
          // Set preview foto profil
          if (auth.user.profilePicture) {
            setPreviewUrl(auth.user.profilePicture);
          } else if (auth.defaultProfilePicture) {
            setPreviewUrl(auth.defaultProfilePicture);
          }
        } else {
          // Jika user tidak tersedia, coba refresh data user
          const refreshedUser = await auth.refreshUser();
          
          if (refreshedUser) {
            setForm({
              nama_lengkap: refreshedUser.nama_lengkap || '',
              username: refreshedUser.username || '',
              currentPassword: '',
              newPassword: '',
              confirmPassword: ''
            });
            
            if (refreshedUser.profilePicture) {
              setPreviewUrl(refreshedUser.profilePicture);
            } else if (auth.defaultProfilePicture) {
              setPreviewUrl(auth.defaultProfilePicture);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing form:', err);
        setError('Gagal memuat data profil. Silakan refresh halaman.');
      } finally {
        setIsDataLoading(false);
      }
    };
    
    initializeForm();
  }, [auth.user, auth.defaultProfilePicture]);

  // Update preview URL jika foto profil berubah
  useEffect(() => {
    if (auth.user && auth.user.profilePicture) {
      setPreviewUrl(auth.user.profilePicture);
    }
  }, [auth.user?.profilePicture]);

  // Cek kekuatan password
  useEffect(() => {
    if (form.newPassword) {
      let score = 0;
      let message = '';
      
      // Cek panjang password
      if (form.newPassword.length >= 8) score += 1;
      if (form.newPassword.length >= 12) score += 1;
      
      // Cek kompleksitas
      if (/[A-Z]/.test(form.newPassword)) score += 1;
      if (/[0-9]/.test(form.newPassword)) score += 1;
      if (/[^A-Za-z0-9]/.test(form.newPassword)) score += 1;
      
      // Tentukan pesan berdasarkan score
      if (score <= 2) {
        message = 'Lemah';
      } else if (score <= 3) {
        message = 'Sedang';
      } else {
        message = 'Kuat';
      }
      
      setPasswordStrength({ score, message });
    } else {
      setPasswordStrength({ score: 0, message: '' });
    }
  }, [form.newPassword]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validasi tipe file
      if (!file.type.match('image.*')) {
        SweetAlert.error('Hanya file gambar yang diperbolehkan');
        return;
      }
      
      // Validasi ukuran file (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        SweetAlert.error('Ukuran file maksimal 2MB');
        return;
      }
      
      setSelectedFile(file);
      
      // Buat preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!auth.user) {
        SweetAlert.error('Anda belum login');
        setIsLoading(false);
        return;
      }
      
      // Validasi nama lengkap tidak kosong
      if (!form.nama_lengkap.trim()) {
        SweetAlert.error('Nama lengkap tidak boleh kosong');
        setIsLoading(false);
        return;
      }
      
      // Validasi username tidak kosong
      if (!form.username.trim()) {
        SweetAlert.error('Username tidak boleh kosong');
        setIsLoading(false);
        return;
      }
      
      const userId = getUserId(auth.user);
      
      if (!userId) {
        SweetAlert.error('User ID tidak ditemukan');
        setIsLoading(false);
        return;
      }
      
      // Validasi password jika ingin mengubah
      if (isChangingPassword) {
        if (!form.currentPassword) {
          SweetAlert.error('Masukkan password saat ini untuk mengubah password');
          setIsLoading(false);
          return;
        }
        
        if (!form.newPassword) {
          SweetAlert.error('Masukkan password baru');
          setIsLoading(false);
          return;
        }
        
        if (form.newPassword !== form.confirmPassword) {
          SweetAlert.error('Password baru dan konfirmasi password tidak cocok');
          setIsLoading(false);
          return;
        }
        
        if (form.newPassword.length < 6) {
          SweetAlert.error('Password baru minimal 6 karakter');
          setIsLoading(false);
          return;
        }
        
        // Validasi kekuatan password
        if (passwordStrength.score < 2) {
          SweetAlert.error('Password terlalu lemah. Gunakan kombinasi huruf besar, angka, dan simbol');
          setIsLoading(false);
          return;
        }
      }
      
      // Update foto profil jika ada perubahan
      if (selectedFile) {
        const pictureResult = await auth.updateProfilePicture(selectedFile);
        
        if (!pictureResult.success) {
          // Penanganan khusus untuk error batas update foto
          if (pictureResult.message?.includes('Batas maksimal update foto')) {
            await SweetAlert.fire({
              title: 'Batas Update Terlampaui',
              html: `${pictureResult.message}<br><small>Silakan coba lagi minggu depan.</small>`,
              icon: 'warning',
              confirmButtonText: 'Mengerti'
            });
          } else {
            SweetAlert.error(pictureResult.message || "Update foto profil gagal");
          }
          setIsLoading(false);
          return;
        }
      }
      
      // Siapkan data untuk update profil
      const updateData: UpdateProfileData = {
        nama_lengkap: form.nama_lengkap,
        username: form.username
      };
      
      // Tambahkan password hanya jika ingin mengubah
      if (isChangingPassword && form.newPassword && form.currentPassword) {
        updateData.currentPassword = form.currentPassword;
        updateData.newPassword = form.newPassword;
      }
    
      // Kirim request update profil
      const result = await auth.updateProfile(updateData);
      
      if (!result.success) {
        // 🔍 DEBUG: Log error dari server
        console.error('=== GAGAL UPDATE PROFILE ===');
        console.error('Error Message:', result.message);
        console.error('===========================');
        
        // Penanganan error 400 (Bad Request)
        if (result.message?.includes('400') || result.message?.includes('Bad Request')) {
          await SweetAlert.fire({
            title: 'Kesalahan Request',
            html: `Request tidak valid.<br><small>Pastikan semua data terisi dengan benar.</small>`,
            icon: 'error',
            confirmButtonText: 'Mengerti'
          });
        } else {
          SweetAlert.error(result.message || "Update profil gagal");
        }
      } else {
        // Tampilkan pesan sukses
        await SweetAlert.success("Profil berhasil diperbarui");
        
        // Reset form password setelah berhasil
        setForm({
          ...form,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        // Reset password strength
        setPasswordStrength({ score: 0, message: '' });
        
        // Reset status changing password
        setIsChangingPassword(false);
      }
    } catch (error) {
      // Error handling dengan parameter
      console.error('=== ERROR KETIK MENJALANKAN UPDATE ===');
      console.error(error);
      console.error('====================================');
      SweetAlert.error("Terjadi kesalahan saat update profil. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Fallback image as data URI
  const fallbackImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ccircle cx='75' cy='60' r='25' fill='%239ca3af'/%3E%3Cpath d='M40 120 Q75 100 110 120 L110 150 L40 150 Z' fill='%239ca3af'/%3E%3C/svg%3E";

  // Tampilkan loading indicator saat data sedang dimuat
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  // Fungsi untuk menentukan warna indikator kekuatan password
  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 mb-6"
        >
          <FaArrowLeft className="mr-2" /> Kembali
        </motion.button>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl font-bold text-center mb-8 text-gray-800"
        >
          Profile Saya
        </motion.h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
            <p className="text-green-500 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <img
                src={previewUrl || fallbackImage}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                onError={(e) => {
                  // If image fails to load, use fallback
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes(fallbackImage)) {
                    target.src = fallbackImage;
                  }
                }}
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={triggerFileInput}
                className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 shadow-md"
              >
                <FaCamera />
              </motion.button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/jpeg,image/png,image/gif"
            />
            <p className="text-gray-500 text-sm">Klik ikon kamera untuk mengganti foto</p>
            <p className="text-yellow-600 text-xs mt-1 text-center">
              Anda dapat mengganti foto profil maksimal 1 kali per minggu
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center border-2 border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
              <FaUser className="text-gray-400 text-xl mr-3" />
              <input
                type="text"
                name="nama_lengkap"
                placeholder="Nama Lengkap"
                value={form.nama_lengkap}
                onChange={handleChange}
                className="w-full outline-none bg-transparent text-gray-700"
                required
              />
            </div>

            <div className="flex items-center border-2 border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
              <FaEnvelope className="text-gray-400 text-xl mr-3" />
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                className="w-full outline-none bg-transparent text-gray-700"
                required
              />
            </div>

            {/* Bagian untuk mengubah password - dipisah dari form utama */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="w-full text-left text-orange-600 hover:text-yellow-800 font-medium text-sm flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center">
                  <FaLock className="mr-2" />
                  {isChangingPassword ? 'Batal Mengubah Password' : 'Ubah Password'}
                </span>
                {isChangingPassword ? '▲' : '▼'}
              </button>

              {isChangingPassword && (
                <div className="mt-4 space-y-4">
                  <div className="border-2 border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
                    <div className="flex items-center">
                      <FaLock className="text-gray-400 text-xl mr-3" />
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        name="currentPassword"
                        placeholder="Masukkan password saat ini"
                        value={form.currentPassword}
                        onChange={handleChange}
                        className="w-full outline-none bg-transparent text-gray-700"
                        required={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Diperlukan untuk verifikasi sebelum mengubah password</p>
                  </div>

                  <div className="border-2 border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
                    <div className="flex items-center">
                      <FaLock className="text-gray-400 text-xl mr-3" />
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        name="newPassword"
                        placeholder="Password Baru"
                        value={form.newPassword}
                        onChange={handleChange}
                        className="w-full outline-none bg-transparent text-gray-700"
                        required={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {form.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Kekuatan Password:</span>
                          <span className={`text-xs font-medium ${
                            passwordStrength.score <= 2 ? 'text-red-500' : 
                            passwordStrength.score <= 3 ? 'text-yellow-500' : 
                            'text-green-500'
                          }`}>
                            {passwordStrength.message}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${getPasswordStrengthColor()}`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Minimal 6 karakter, gunakan kombinasi huruf besar, angka, dan simbol untuk keamanan lebih baik
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-2 border-gray-200 rounded-xl p-3 focus-within:border-blue-500 transition-colors">
                    <div className="flex items-center">
                      <FaLock className="text-gray-400 text-xl mr-3" />
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="Konfirmasi Password Baru"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        className="w-full outline-none bg-transparent text-gray-700"
                        required={isChangingPassword}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {form.confirmPassword && form.newPassword && form.newPassword !== form.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">Password tidak cocok</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-400 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center mt-6"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <FaSave className="mr-2" /> Simpan Perubahan
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}