// src/super-admin/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Settings,
  Home,
  BarChart3,
  ChevronDown,
  CogIcon,
  Circle,
  TrendingUp,
  CircleDollarSign,
  Scale,
  FileSpreadsheet,
  ChartNoAxesCombined
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import { Building2 } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface SettingsResponse {
  storeLogo: string;
}

const API_KEY = import.meta.env.VITE_API_KEY;

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [marqueeKey, setMarqueeKey] = useState(0);
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const fetchStoreLogo = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          setLogoError(true);
          return;
        }

        const response = await fetch(`${API_URL}/api/super-admin/settings`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch store logo');
        }
        const data: SettingsResponse = await response.json();
        if (data.storeLogo) {
          setStoreLogo(data.storeLogo);
        }
      } catch (error) {
        console.error('Error fetching store logo:', error);
        setLogoError(true);
      }
    };

    fetchStoreLogo();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMarqueeKey(prev => prev + 1);
    }
  }, [isOpen]);

  const toggleDropdown = (menu: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (activeDropdown === menu) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(menu);
    }
  };

  const isMenuActive = (item: MenuItem): boolean => {
    if (item.path) {
      return location.pathname === item.path;
    }
    
    if (item.submenu) {
      return item.submenu.some((subItem) => 
        location.pathname === subItem.path
      );
    }
    
    return false;
  };

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard', 
      path: '/super-admin/dashboard',
      icon: <Home size={20} />,
    },
    {
      name: 'Grafik Omzet',
      path: '/super-admin/dashboard-analytics',
      icon: <ChartNoAxesCombined size={20} />,
    },
    {
      name: 'Laporan Keuangan',
      path: '/super-admin/laporan-keuangan',
      icon: <BarChart3 size={20} />,
    },
    {
      name: 'Neraca',
      path: '/super-admin/neraca',
      icon: <FileSpreadsheet size={20} />,
    },
    {
      name: 'Modal Utama',
      path: '/super-admin/modal-utama',
      icon: <CircleDollarSign size={20} />,
    },
    {
      name: 'Aset Tetap',
      path: '/super-admin/aset-tetap',
      icon: <Building2 size={20} />,
    },
    {
      name: 'Liabilitas',
      path: '/super-admin/liabilitas',
      icon: <Scale size={20} />,
    },
    {
      name: 'Biaya Layanan',
      path: '/super-admin/biaya-layanan',
      icon: <CogIcon size={20} />,
    },
    {
      name: 'User Management',
      icon: <Users size={20} />,
      path: '/super-admin/users',
    },
    {
      name: 'Konfigurasi',
      icon: <Settings size={20} />,
      path: '/super-admin/settings',
    },
  ];

  const DropdownArrow = ({ isOpen }: { isOpen: boolean }) => (
    <ChevronDown 
      size={16} 
      className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
    />
  );

  return (
    <>
      {/* Sidebar Backdrop (for mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`bg-gradient-to-b from-orange-600 to-yellow-500 text-white w-64 fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30 shadow-xl flex flex-col`}>
        
        {/* Header dengan Logo */}
        <div className="text-white flex items-center px-4 py-5 flex-shrink-0 border-b border-orange-500/30">
          <div className="flex items-center space-x-3">
            {storeLogo && !logoError ? (
              <div className="bg-white p-1.5 rounded-lg shadow-md">
                <img 
                  src={storeLogo} 
                  alt="Store Logo" 
                  className="h-10 w-10 object-contain"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="bg-white p-2 rounded-lg shadow-md">
                <span className="text-orange-600 text-2xl font-bold">S+</span>
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-yellow-300">
                  Super Admin
                </span>
              </h1>
              <div className="text-xs text-orange-100 mt-0.5 flex items-center">
                <Circle size={8} className="text-green-400 mr-1.5 fill-current" />
                Super Admin Panel
              </div>
            </div>
          </div>
        </div>

        {/* Marquee Section */}
        <div className="px-4 py-3 bg-orange-700/30 rounded-lg mx-2 my-4 overflow-hidden flex-shrink-0 relative border border-orange-500/30">
          <div 
            key={marqueeKey}
            className="text-sm text-orange-100 whitespace-nowrap animate-marquee-smooth flex items-center"
          >
            <TrendingUp size={14} className="mr-2 text-yellow-300" />
            Selamat datang di Panel Super Admin - Kelola seluruh sistem dengan mudah!
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {menuItems.map((item) => (
            <div key={item.name} className="mb-1">
              {item.submenu ? (
                <div>
                  <button
                    onClick={(e) => toggleDropdown(item.name, e)}
                    className={`w-full flex justify-between items-center py-3 px-4 rounded-lg transition-all duration-200 hover:bg-orange-700/60 hover:shadow-md hover:scale-[1.02] group ${
                      isMenuActive(item) ? 'bg-orange-700/60 shadow-md border border-orange-400/30' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`mr-3 transition-colors duration-200 group-hover:text-yellow-300 ${
                        isMenuActive(item) ? 'text-yellow-300' : 'text-orange-100'
                      }`}>
                        {item.icon}
                      </div>
                      <span className="font-bold text-orange-50 group-hover:text-white">
                        {item.name}
                      </span>
                    </div>
                    <div className={`transition-colors duration-200 group-hover:text-yellow-300 ${
                      isMenuActive(item) ? 'text-yellow-300' : 'text-orange-200'
                    }`}>
                      <DropdownArrow isOpen={activeDropdown === item.name} />
                    </div>
                  </button>
                  
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      activeDropdown === item.name ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                    style={{ transitionProperty: 'max-height, opacity' }}
                  >
                    <div className="pl-4 py-2 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className={`flex items-center py-2.5 px-4 rounded-lg transition-all duration-200 hover:bg-orange-700/40 hover:shadow-md hover:translate-x-1 group ${
                            location.pathname === subItem.path ? 'bg-orange-700/40 border border-orange-400/30' : ''
                          }`}
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              onClose();
                            }
                          }}
                        >
                          <div className={`mr-3 transition-colors duration-200 group-hover:text-yellow-300 ${
                            location.pathname === subItem.path ? 'text-yellow-300' : 'text-orange-200'
                          }`}>
                            {subItem.icon}
                          </div>
                          <span className={`text-sm font-bold transition-colors duration-200 group-hover:text-white ${
                            location.pathname === subItem.path ? 'text-yellow-300' : 'text-orange-100'
                          }`}>
                            {subItem.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to={item.path!}
                  className={`flex items-center py-3 px-4 rounded-lg transition-all duration-200 hover:bg-orange-700/60 hover:shadow-md hover:scale-[1.02] group ${
                    location.pathname === item.path ? 'bg-orange-700/60 shadow-md border border-orange-400/30' : ''
                  }`}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <div className={`mr-3 transition-colors duration-200 group-hover:text-yellow-300 ${
                    location.pathname === item.path ? 'text-yellow-300' : 'text-orange-100'
                  }`}>
                    {item.icon}
                  </div>
                  <span className={`font-bold transition-colors duration-200 group-hover:text-white ${
                    location.pathname === item.path ? 'text-yellow-300' : 'text-orange-50'
                  }`}>
                    {item.name}
                  </span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Section */}
        <div className="p-4 border-t border-orange-500/30 mt-auto">
          <div className="flex items-center justify-between text-orange-100 text-sm">
            <div className="flex items-center">
              <Circle size={8} className="text-green-400 mr-2 fill-current" />
              <span className="text-orange-50">Online</span>
            </div>
            <div className="text-xs text-orange-200">
              v1.0.0
            </div>
          </div>
        </div>
      </div>

      {/* CSS Styles */}
      <style>{`
        @keyframes marquee-smooth {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .animate-marquee-smooth {
          animation: marquee-smooth 15s linear infinite;
          display: inline-block;
          padding-left: 100%;
        }

        @media (max-width: 768px) {
          .animate-marquee-smooth {
            animation-duration: 12s;
          }
        }

        .bg-orange-700\\/30:hover .animate-marquee-smooth {
          animation-play-state: paused;
        }

        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </>
  );
};

export default Sidebar;
