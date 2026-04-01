import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../../auth/context/AuthContext';
import { 
  Home, 
  FileText, 
  User, 
  LogOut, 
  LogIn
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
  
interface MenuItem {
  id: string;
  name: string;
  icon: React.ReactNode; // Changed from string to React.ReactNode
  path: string;
  authRequired?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface UserProfile {
  _id: string;
  nama_lengkap: string;
  email: string;
  username: string;
  role: string;
  profilePicture?: string;
}

interface StoreSettings {
  storeLogo?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const authContext = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(true);
  const [logoError, setLogoError] = useState(false);
  
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  
  const { user, logout } = authContext;
  
  const menuItems: MenuItem[] = [
        { id: 'dashboard', name: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { id: 'status-pesanan', name: 'Riwayat', icon: <FileText size={20} />, path: '/pesanan', authRequired: true },
    { id: 'profile', name: 'Profile', icon: <User size={20} />, path: '/profile', authRequired: true },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.authRequired && !user) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const token = getStoredToken();
          const response = await fetch(`${API_URL}/api/update-profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const profileData: UserProfile = await response.json();
            setUserProfile(profileData);
          } else {
            console.error('Failed to fetch user profile');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setLoadingProfile(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const fetchStoreLogo = async () => {
      try {
        const token = getStoredToken();
        const hasValidToken = !!token && token !== 'null' && token !== 'undefined';
        if (!hasValidToken) {
          setLoadingLogo(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/common/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        
        if (response.ok) {
          const settingsData: StoreSettings = await response.json();
          if (settingsData.storeLogo) {
            const logoUrl = settingsData.storeLogo.startsWith('http') 
              ? settingsData.storeLogo 
              : `${API_URL}${settingsData.storeLogo}`;
            setStoreLogo(logoUrl);
          }
        } else {
          console.error('Failed to fetch store settings');
        }
      } catch (error) {
        console.error('Error fetching store settings:', error);
      } finally {
        setLoadingLogo(false);
      }
    };
    
    fetchStoreLogo();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      if (window.innerWidth < 768) {
        onToggle();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleLogoError = () => {
    setLogoError(true);
  };

  const getProfilePictureUrl = (profilePicture?: string) => {
    if (!profilePicture) return null;
    
    if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
      return profilePicture;
    }
    
    return `${API_URL}${profilePicture}`;
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        ></div>
      )}
      
      <div 
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {loadingLogo ? (
                <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse"></div>
              ) : storeLogo && !logoError ? (
                <img 
                  src={storeLogo} 
                  alt="Store Logo" 
                  className="w-16 h-16 rounded-xl object-cover shadow-md"
                  onError={handleLogoError}
                />
              ) : (
                <div className="bg-amber-500 p-3 rounded-xl shadow-md">
                  <span className="text-white text-2xl font-bold">K+</span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-800">KasirPlus</h1>
                <p className="text-xs text-gray-500">Point of Sale System</p>
              </div>
            </div>
          </div>
          
          {user && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {loadingProfile ? (
                  <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                ) : (
                  <>
                    {(() => {
                      const profilePictureUrl = getProfilePictureUrl(userProfile?.profilePicture);
                      return profilePictureUrl && !imageError ? (
                        <img 
                          src={profilePictureUrl} 
                          alt="Profile" 
                          className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                          onError={handleImageError}
                        />
                      ) : (
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User size={20} className="text-blue-600" />
                        </div>
                      );
                    })()}
                  </>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {userProfile?.nama_lengkap || user.nama_lengkap || 'Pengguna'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex-1 p-4 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Main Menu</h2>
            <div className="space-y-1">
              {filteredMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-amber-50'
                  }`}
                >
                  {item.icon}
                  <span className="font-bold">{item.name}</span>
                </button>
              ))}
              
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 text-gray-700 hover:bg-red-50"
                >
                  <LogOut size={20} />
                  <span className="font-bold">Logout</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    navigate('/login');
                    if (window.innerWidth < 768) {
                      onToggle();
                    }
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 ${
                    location.pathname === '/login'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'text-gray-700 hover:bg-amber-50'
                  }`}
                >
                  <LogIn size={20} />
                  <span className="font-bold">Login</span>
                </button>
              )}
            </div>
            
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Informasi</h3>
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Tips:</span> Gunakan search untuk produk yang ingin anda cari dan beli
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">© 2026 KasirPlus</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
