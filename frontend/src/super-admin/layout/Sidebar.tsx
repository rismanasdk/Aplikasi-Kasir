// src/super-admin/layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Settings,
  Home,
  BarChart3,
  ChevronDown,
  Store,
  CogIcon
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
      submenu: [
        { name: 'Dashboard Utama', path: '/super-admin/dashboard', icon: <Home size={16} /> },
        { name: 'Laporan Keuangan', path: '/super-admin/laporan-keuangan', icon: <BarChart3 size={16} /> },
      ],
    },
    {
      name: 'Biaya Management',
      icon: <DollarSign size={20} />,
      submenu: [
        { name: 'Modal Utama', path: '/super-admin/modal-utama', icon: <Store size={16} /> },
        { name: 'Biaya Layanan', path: '/super-admin/biaya-layanan', icon: <CogIcon size={16} /> },
      ],
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

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-900 to-purple-800 text-white
        transform transition-transform duration-300 md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        overflow-y-auto
      `}>
        {/* Logo Section */}
        <div className="p-6 border-b border-purple-700">
          <Link to="/" className="flex items-center justify-center space-x-3 hover:opacity-80 transition-opacity">
            {!logoError && storeLogo ? (
              <img src={storeLogo} alt="Store Logo" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Store size={24} className="text-white" />
              </div>
            )}
            <span className="text-xl font-bold">Super Admin</span>
          </Link>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = isMenuActive(item);
            const isDropdownActive = item.submenu && activeDropdown === item.name;

            return (
              <div key={item.name}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={(e) => toggleDropdown(item.name, e)}
                      className={`
                        w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-200
                        ${isActive ? 'bg-purple-700 text-white' : 'text-purple-100 hover:bg-purple-700 hover:text-white'}
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-200 ${isDropdownActive ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Submenu */}
                    {isDropdownActive && (
                      <div className="mt-2 ml-4 space-y-1 border-l-2 border-purple-600 pl-2">
                        {item.submenu.map((subitem) => (
                          <Link
                            key={subitem.path}
                            to={subitem.path}
                            onClick={onClose}
                            className={`
                              flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
                              ${location.pathname === subitem.path 
                                ? 'bg-purple-600 text-white' 
                                : 'text-purple-100 hover:bg-purple-700 hover:text-white'
                              }
                            `}
                          >
                            {subitem.icon}
                            <span className="text-sm">{subitem.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path || '#'}
                    onClick={onClose}
                    className={`
                      flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200
                      ${location.pathname === item.path 
                        ? 'bg-purple-700 text-white' 
                        : 'text-purple-100 hover:bg-purple-700 hover:text-white'
                      }
                    `}
                  >
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-purple-700">
          <p className="text-xs text-purple-300 text-center">Super Admin Portal</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
