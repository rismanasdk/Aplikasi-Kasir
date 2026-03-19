import React, { createContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
const ApiKey = import.meta.env.VITE_API_KEY;


interface User {
  id?: string;
  _id?: string;
  nama_lengkap: string;
  username?: string;
  role: 'admin' | 'manajer' | 'kasir' | 'user' | 'chef';
  status: string;
  profilePicture?: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

interface RegisterResponse {
  message: string;
  user: User;
}

interface LogoutResponse {
  message: string;
}

type MeResponse = { user: User } | User;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  defaultProfilePicture: string;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (nama_lengkap: string, username: string, password: string, role: 'admin' | 'manajer' | 'kasir' | 'user' | 'chef' ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfilePicture: (profilePicture: File) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (profileData: {
    nama_lengkap: string;
    username: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  getDefaultProfilePicture: () => Promise<{ success: boolean; defaultProfilePicture?: string; message?: string }>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (status: boolean) => void;
  handleGoogleToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const _meta = import.meta as { env?: { VITE_API_BASE_URL?: string; VITE_API_KEY?: string } };
const API_BASE_URL = _meta.env?.VITE_API_BASE_URL ?? API_URL;
const API_KEY = _meta.env?.VITE_API_KEY ?? `${ApiKey}`;

function isAxiosError(error: unknown): error is { isAxiosError: true; response?: { data?: ErrorResponse }; message?: string } {
  return typeof error === 'object' && error !== null && 'isAxiosError' in (error as Record<string, unknown>) && (error as Record<string, unknown>)['isAxiosError'] === true;
}

function getMessageFromUnknown(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { message?: unknown };
  return typeof e.message === 'string' ? e.message : undefined;
}

interface ErrorResponse {
  message?: string;
}

function getUserId(user: User): string {
  return user._id || user.id || '';
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [defaultProfilePicture, setDefaultProfilePicture] = useState<string>('');
  const hasBootstrappedMe = useRef(false);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const fetchDefaultProfilePicture = useCallback(async (): Promise<{ success: boolean; defaultProfilePicture?: string; message?: string }> => {
    try {
      const token = localStorage.getItem("token");
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const isAdmin = currentUser?.role === "admin";

      if (!token || !isAdmin) {
        return { success: false, message: "Default profile picture hanya untuk admin" };
      }

      const { data } = await axios.get<{ defaultProfilePicture: string }>(
        `${API_BASE_URL}/api/admin/settings`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': API_KEY
          }
        }
      );

      const defaultPic = data.defaultProfilePicture;
      setDefaultProfilePicture(defaultPic);
      return { success: true, defaultProfilePicture: defaultPic };
    } catch (error) {
      console.error('Get default profile picture gagal:', error);
      
      if (isAxiosError(error)) {
        const errorMessage = (error.response?.data as ErrorResponse)?.message ?? error.message;
        return { success: false, message: errorMessage || 'Terjadi kesalahan saat mendapatkan default profile picture' };
      }

      const fallback = getMessageFromUnknown(error);
      return { success: false, message: fallback ?? 'Terjadi kesalahan saat mendapatkan default profile picture' };
    }
  }, []);

  useEffect(() => {
    fetchDefaultProfilePicture();
  }, [fetchDefaultProfilePicture]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
  setIsLoading(true);

  try {
    const { data } = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
      username,
      password
    }, {
      headers: {
        'x-api-key': API_KEY  // Tambahkan header ini
      }
    });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setIsAuthenticated(true);
    return { success: true };
  } catch (error) {
    console.error('Login gagal:', error);

    if (isAxiosError(error)) {
      const errorMessage = (error.response?.data as ErrorResponse)?.message ?? error.message;
      return { success: false, message: errorMessage || 'Terjadi kesalahan saat login' };
    }

    const fallback = getMessageFromUnknown(error);
    return { success: false, message: fallback ?? 'Terjadi kesalahan saat login' };
  } finally {
    setIsLoading(false);
  }
}, []);

  const register = useCallback(async (nama_lengkap: string, username: string, password: string, role: 'admin' | 'manajer' | 'kasir' | 'user' | 'chef'): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      await axios.post<RegisterResponse>(`${API_BASE_URL}/auth/register`, {
        nama_lengkap,
        username,
        password,
        role
      }, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      return await login(username, password);
    } catch (error) {
      console.error('Register gagal:', error);

      if (isAxiosError(error)) {
        const errorMessage = (error.response?.data as ErrorResponse)?.message ?? error.message;
        return { success: false, message: errorMessage || 'Terjadi kesalahan saat registrasi' };
      }

      const fallback = getMessageFromUnknown(error);
      return { success: false, message: fallback ?? 'Terjadi kesalahan saat registrasi' };
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(async (): Promise<void> => {
    const token = localStorage.getItem('token');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('token');

    try {
      if (token) {
        const { data } = await axios.post<LogoutResponse>(`${API_BASE_URL}/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': API_KEY,
          }
        });

        console.log(data.message);
      }
    } catch (error) {
      console.error('Logout gagal:', error);

      if (isAxiosError(error)) {
        const errorMessage = (error.response?.data as ErrorResponse)?.message ?? error.message;
        console.error('Logout error response:', errorMessage || error.response?.data);
      } else {
        console.error('Logout error:', getMessageFromUnknown(error) ?? error);
      }
    }
  }, []);

  const updateProfilePicture = useCallback(async (profilePicture: File): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return { success: false, message: 'Anda belum login' };
      }

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = currentUser.role || 'user';
      const userId = getUserId(currentUser);

      if (!userId) {
        return { success: false, message: 'User ID tidak ditemukan' };
      }

      const formData = new FormData();
      formData.append('profilePicture', profilePicture);

      const url = `${API_BASE_URL}/api/update-profile/${userRole}/${userId}/profile-picture`;

      const { data } = await axios.put<{ message: string; user: User }>(
        url,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': API_KEY
          }
        }
      );

      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Update profile picture gagal:', error);
      
      if (isAxiosError(error)) {
        console.error('Error response:', error.response?.data);
        const errorMessage = (error.response?.data as ErrorResponse)?.message ?? error.message;
        return { success: false, message: errorMessage || 'Terjadi kesalahan saat update profile picture' };
      }

      const fallback = getMessageFromUnknown(error);
      return { success: false, message: fallback ?? 'Terjadi kesalahan saat update profile picture' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData: {
    nama_lengkap: string;
    username: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return { success: false, message: 'Anda belum login' };
      }

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userRole = currentUser.role || 'user';
      const userId = getUserId(currentUser);

      if (!userId) {
        return { success: false, message: 'User ID tidak ditemukan' };
      }

      const url = `${API_BASE_URL}/api/update-profile/${userRole}/${userId}`;

      const { data } = await axios.put<{ message: string; user: User }>(
        url,
        profileData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': API_KEY
          }
        }
      );

      if (data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Update profile gagal:', error);

      if (isAxiosError(error)) {
        console.error('Error response:', error.response?.data);
        const errorMessage = (error.response?.data as ErrorResponse)?.message ?? error.message;
        return { success: false, message: errorMessage || 'Terjadi kesalahan saat update profil' };
      }

      const fallback = getMessageFromUnknown(error);
      return { success: false, message: fallback ?? 'Terjadi kesalahan saat update profil' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return null;
      }

      const { data } = await axios.get<MeResponse>(
        `${API_BASE_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': API_KEY
          }
        }
      );

      const meUser = "user" in data ? data.user : data;
      if (meUser) {
        setUser(meUser);
        localStorage.setItem('user', JSON.stringify(meUser));
        return meUser;
      }
      
      return null;
    } catch (error) {
      console.error('Fetch current user failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  const handleGoogleToken = useCallback(async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      console.log("Saving token to localStorage in handleGoogleToken");
      // Simpan token ke localStorage
      localStorage.setItem('token', token);
      console.log("Token saved to localStorage in handleGoogleToken");
      
      // Decode token untuk mendapatkan informasi user
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      
      const userInfo = JSON.parse(jsonPayload);
      
      // Set user ke state
      setUser(userInfo);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(userInfo));
      
      console.log('Google login successful, user info:', userInfo);
    } catch (error) {
      console.error('Error handling Google token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      throw error; // Re-throw error untuk ditangani di komponen
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasBootstrappedMe.current) return;
    hasBootstrappedMe.current = true;

    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  const value = useMemo(() => ({ 
    user, 
    isLoading, 
    defaultProfilePicture,
    isAuthenticated,
    login, 
    register, 
    logout, 
    updateProfilePicture,
    updateProfile,
    getDefaultProfilePicture: fetchDefaultProfilePicture,
    refreshUser: fetchCurrentUser,
    setUser,
    setIsAuthenticated,
    handleGoogleToken
  }), [user, isLoading, isAuthenticated, defaultProfilePicture, login, register, logout, updateProfilePicture, updateProfile, fetchDefaultProfilePicture, fetchCurrentUser, handleGoogleToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
