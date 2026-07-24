import React, { createContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { clearStoredAuthSession, getStoredAuth, getStoredToken, getStoredUser, setStoredAuthSession, setStoredToken } from '../storage';
const ApiKey = import.meta.env.VITE_API_KEY;


interface UserProfile {
  id?: string;
  _id?: string;
  nama_lengkap: string;
  username?: string;
  email?: string;
  status: string;
  role?: string;
  profilePicture?: string;
}

interface RolePayload {
  id: string | null;
  code?: string | null;
  name: string | null;
}

interface BranchPayload {
  id: string | null;
  name: string | null;
}

interface AuthSession {
  user: UserProfile;
  role: RolePayload;
  branch: BranchPayload;
  permissions: string[];
}

interface LoginResponse {
  message: string;
  token: string;
}

interface RegisterResponse {
  message: string;
  user: UserProfile;
}

interface LogoutResponse {
  message: string;
}

type MeResponse = AuthSession;

interface AuthContextType {
  auth: AuthSession | null;
  user: UserProfile | null;
  role: RolePayload | null;
  branch: BranchPayload | null;
  permissions: string[];
  isLoading: boolean;
  defaultProfilePicture: string;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (nama_lengkap: string, username: string, password: string, role: 'admin' | 'manajer' | 'kasir' | 'user' | 'chef' | 'security') => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateProfilePicture: (profilePicture: File) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (profileData: {
    nama_lengkap: string;
    username: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  getDefaultProfilePicture: () => Promise<{ success: boolean; defaultProfilePicture?: string; message?: string }>;
  refreshUser: () => Promise<AuthSession | null>;
  setAuth: (auth: AuthSession | null) => void;
  setIsAuthenticated: (status: boolean) => void;
  handleGoogleToken: (token: string) => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const _meta = import.meta as { env?: { VITE_API_KEY?: string } };
const API_BASE_URL = API_URL;
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

function getUserId(user: UserProfile | null | undefined): string {
  return user?._id || user?.id || '';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const normalized = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const decoded = typeof window !== 'undefined' && typeof window.atob === 'function'
      ? window.atob(normalized)
      : Buffer.from(normalized, 'base64').toString('utf8');

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch (error) {
    console.warn('Failed to decode JWT payload:', error);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<RolePayload | null>(null);
  const [branch, setBranch] = useState<BranchPayload | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [defaultProfilePicture, setDefaultProfilePicture] = useState<string>('');
  const hasBootstrappedMe = useRef(false);

  const setAuthSession = useCallback((authSession: AuthSession | null, token?: string) => {
    if (!authSession) {
      clearStoredAuthSession();
      setAuth(null);
      setUser(null);
      setRole(null);
      setBranch(null);
      setPermissions([]);
      setIsAuthenticated(false);
      return;
    }

    const authToken = token || getStoredToken();
    if (authToken) {
      setStoredAuthSession(authToken, authSession);
    }

    setAuth(authSession);
    setUser(authSession.user);
    setRole(authSession.role);
    setBranch(authSession.branch);
    setPermissions(authSession.permissions || []);
    setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const storedAuth = getStoredAuth<AuthSession>();
      const token = getStoredToken();
      
      if (storedAuth && token) {
        setAuth(storedAuth);
        setUser(storedAuth.user);
        setRole(storedAuth.role);
        setBranch(storedAuth.branch);
        setPermissions(storedAuth.permissions || []);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const fetchDefaultProfilePicture = useCallback(async (): Promise<{ success: boolean; defaultProfilePicture?: string; message?: string }> => {
    try {
      const token = getStoredToken();
      const storedAuth = getStoredAuth<AuthSession>();
      const currentRole = role?.code || auth?.role?.code || storedAuth?.role?.code || auth?.user?.role;
      const normalizedRole = String(currentRole || '').toLowerCase();
      const canReadCommonSettings = normalizedRole === "admin" || normalizedRole === "super-admin" || normalizedRole === "super_admin";

      if (!token || !canReadCommonSettings) {
        return { success: false, message: "Default profile picture hanya untuk admin" };
      }

      const { data } = await axios.get<{ defaultProfilePicture: string }>(
        `${API_BASE_URL}/api/common/settings`,
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
  }, [auth, role]);

  const fetchCurrentUser = useCallback(async (): Promise<AuthSession | null> => {
    try {
      const token = getStoredToken();
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

      const authSession = data;
      setAuthSession(authSession, token);

      if (authSession.role?.code === 'admin') {
        fetchDefaultProfilePicture();
      }

      return authSession;
    } catch (error) {
      console.error('Fetch current user failed:', error);
      setAuthSession(null);
      return null;
    }
  }, [fetchDefaultProfilePicture, setAuthSession]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      const { data } = await axios.post<LoginResponse>(`${API_BASE_URL}/auth/login`, {
        username,
        password
      }, {
        headers: {
          'x-api-key': API_KEY
        }
      });

      setStoredToken(data.token);
      const meAuth = await fetchCurrentUser();
      if (!meAuth) {
        setAuthSession(null);
        return { success: false, message: 'Gagal memuat data pengguna setelah login' };
      }

      if (meAuth.role?.code === 'admin') {
        fetchDefaultProfilePicture();
      }

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
  }, [fetchCurrentUser, fetchDefaultProfilePicture, setAuthSession]);

  const register = useCallback(async (nama_lengkap: string, username: string, password: string, role: 'admin' | 'manajer' | 'kasir' | 'user' | 'chef' | 'security'): Promise<{ success: boolean; message?: string }> => {
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
    const token = getStoredToken();
    setAuthSession(null);

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
  }, [setAuthSession]);

  const updateProfilePicture = useCallback(async (profilePicture: File): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      const token = getStoredToken();
      
      if (!token) {
        return { success: false, message: 'Anda belum login' };
      }

      const currentUser = auth?.user || user || getStoredUser<UserProfile>() || ({} as UserProfile);
      const userId = getUserId(currentUser);

      if (!userId) {
        return { success: false, message: 'User ID tidak ditemukan' };
      }

      const formData = new FormData();
      formData.append('profilePicture', profilePicture);

      const url = `${API_BASE_URL}/api/update-profile/user/${userId}/profile-picture`;

      const { data } = await axios.put<{ message: string; user: UserProfile }>(
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
        const updatedSession: AuthSession = auth
          ? { ...auth, user: data.user }
          : {
              user: data.user,
              role: role ?? { id: null, code: null, name: null },
              branch: branch ?? { id: null, name: null },
              permissions,
            };
        setAuthSession(updatedSession, token);
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
  }, [auth, user, role, branch, permissions, setAuthSession]);

  const updateProfile = useCallback(async (profileData: {
    nama_lengkap: string;
    username: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);

    try {
      const token = getStoredToken();
      
      if (!token) {
        return { success: false, message: 'Anda belum login' };
      }

      const currentUser = auth?.user || user || getStoredUser<UserProfile>() || ({} as UserProfile);
      const userId = getUserId(currentUser);

      if (!userId) {
        return { success: false, message: 'User ID tidak ditemukan' };
      }

      const url = `${API_BASE_URL}/api/update-profile/user/${userId}`;

      const { data } = await axios.put<{ message: string; user: UserProfile }>(
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
        const updatedSession: AuthSession = auth
          ? { ...auth, user: data.user }
          : {
              user: data.user,
              role: role ?? { id: null, code: null, name: null },
              branch: branch ?? { id: null, name: null },
              permissions,
            };
        setAuthSession(updatedSession, token);
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
  }, [auth, user, role, branch, permissions, setAuthSession]);

  const handleGoogleToken = useCallback(async (token: string): Promise<AuthSession | null> => {
    try {
      setIsLoading(true);
      setStoredToken(token);

      let authSession = null as AuthSession | null;
      try {
        authSession = await fetchCurrentUser();
      } catch (error) {
        console.warn('fetchCurrentUser failed for Google token, falling back to token payload:', error);
      }

      if (!authSession) {
        const decodedPayload = decodeJwtPayload(token);
        if (decodedPayload) {
          const roleValue = decodedPayload.role;
          const roleCode = typeof roleValue === 'string'
            ? roleValue
            : (roleValue as { code?: string | null; name?: string | null } | undefined)?.code || (roleValue as { code?: string | null; name?: string | null } | undefined)?.name || '';

          const fallbackSession: AuthSession = {
            user: {
              id: String(decodedPayload.id || decodedPayload._id || ''),
              _id: String(decodedPayload.id || decodedPayload._id || ''),
              nama_lengkap: String(decodedPayload.nama_lengkap || decodedPayload.username || 'Google User'),
              username: String(decodedPayload.username || ''),
              email: String(decodedPayload.email || ''),
              status: String(decodedPayload.status || 'active'),
              role: roleCode,
              profilePicture: String(decodedPayload.profilePicture || '')
            },
            role: {
              id: null,
              code: roleCode,
              name: roleCode || 'user'
            },
            branch: {
              id: null,
              name: null
            },
            permissions: []
          };

          setAuthSession(fallbackSession, token);
          return fallbackSession;
        }

        throw new Error('Gagal memuat data pengguna setelah login Google');
      }

      return authSession;
    } catch (error) {
      console.error('Error handling Google token:', error);
      setAuthSession(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentUser, setAuthSession]);

  useEffect(() => {
    if (hasBootstrappedMe.current) return;
    hasBootstrappedMe.current = true;

    const token = getStoredToken();
    if (token) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  const value = useMemo(() => ({ 
    auth,
    user, 
    role,
    branch,
    permissions,
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
    setAuth: setAuthSession,
    setIsAuthenticated,
    handleGoogleToken
  }), [auth, user, role, branch, permissions, isLoading, isAuthenticated, defaultProfilePicture, login, register, logout, updateProfilePicture, updateProfile, fetchDefaultProfilePicture, fetchCurrentUser, setAuthSession, handleGoogleToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
