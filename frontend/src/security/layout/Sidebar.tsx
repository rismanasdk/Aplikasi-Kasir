// src/security/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertCircle,
  Database,
  Shield,
  Settings,
  TrendingUp,
  Eye,
  ChevronDown,
  Circle,
} from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

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

        const response = await fetch(`${API_URL}/api/common/settings`, {
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
      icon: <LayoutDashboard size={20} />,
      path: '/security/dashboard',
    },
    {
      name: 'Monitoring',
      icon: <Eye size={20} />,
      submenu: [
        { name: 'Server Logs', path: '/security/logs', icon: <Database size={16} /> },
        { name: 'Real-time Alerts', path: '/security/alerts', icon: <AlertCircle size={16} /> },
        { name: 'System Health', path: '/security/system-health', icon: <TrendingUp size={16} /> },
      ],
    },
    {
      name: 'IP Management',
      icon: <Shield size={20} />,
      submenu: [
        { name: 'Blocked IPs', path: '/security/blocked-ips', icon: <Circle size={16} /> },
        { name: 'IP Statistics', path: '/security/ip-statistics', icon: <TrendingUp size={16} /> },
      ],
    },
    {
      name: 'Settings',
      icon: <Settings size={20} />,
      path: '/security/settings',
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
      <div className={`bg-gradient-to-b from-orange-500 to-yellow-400 text-white w-64 fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30 shadow-xl flex flex-col`}>
        
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
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-cyan-300">
                  Security
                </span>
              </h1>
              <p className="text-xs text-orange-200">Management</p>
            </div>
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
                      <div className={`mr-3 transition-colors duration-200 group-hover:text-cyan-300 ${
                        isMenuActive(item) ? 'text-cyan-300' : 'text-orange-100'
                      }`}>
                        {item.icon}
                      </div>
                      <span className="font-bold text-orange-50 group-hover:text-white">
                        {item.name}
                      </span>
                    </div>
                    <div className={`transition-colors duration-200 group-hover:text-cyan-300 ${
                      isMenuActive(item) ? 'text-cyan-300' : 'text-orange-200'
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
                          <div className={`mr-2 transition-colors duration-200 group-hover:text-cyan-300 ${
                            location.pathname === subItem.path ? 'text-cyan-300' : 'text-orange-200'
                          }`}>
                            {subItem.icon}
                          </div>
                          <span className="text-sm font-medium text-orange-50 group-hover:text-white">
                            {subItem.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to={item.path || '#'}
                  className={`flex items-center py-3 px-4 rounded-lg transition-all duration-200 hover:bg-orange-700/60 hover:shadow-md hover:scale-[1.02] group ${
                    isMenuActive(item) ? 'bg-orange-700/60 shadow-md border border-orange-400/30' : ''
                  }`}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <div className={`mr-3 transition-colors duration-200 group-hover:text-cyan-300 ${
                    isMenuActive(item) ? 'text-cyan-300' : 'text-orange-100'
                  }`}>
                    {item.icon}
                  </div>
                  <span className="font-bold text-orange-50 group-hover:text-white">
                    {item.name}
                  </span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="text-center text-orange-200 text-xs p-4 border-t border-orange-500/30">
          Security Module v1.0.0
        </div>
      </div>
    </>
  );
};

export default Sidebar;
