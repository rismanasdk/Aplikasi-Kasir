// layout.tsx
import { useState, type ReactNode, useEffect, useRef } from "react";
import {
  Home,
  ShoppingCart,
  Menu as MenuIcon,
  X,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { API_URL } from '../../config/api';
export default function MainLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main Content */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
          collapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

// ================= Sidebar =================
function Sidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}) {
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<boolean>(false);

  useEffect(() => {
    const fetchStoreLogo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/common/settings`, {
          headers: getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch store logo');
        const data = await response.json();
        if (data.storeLogo) setStoreLogo(data.storeLogo);
      } catch (err) {
        console.error('Error fetching store logo:', err);
        setLogoError(true);
      }
    };

    fetchStoreLogo();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setOpen(false);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menu = [
    { label: "Dashboard", icon: <Home className="w-5 h-5" />, path: "/kasir/dashboard" },
    { label: "Status Pesanan", icon: <ShoppingCart className="w-5 h-5" />, path: "/kasir/pesanan" },
  ];

  return (
    <>
      {/* Toggle button untuk mobile - Posisi disesuaikan */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white rounded-md transition-all duration-300 hover:opacity-90 shadow-md"
        onClick={() => setOpen(!open)}
        style={{ zIndex: 1050 }}
      >
        {open ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
      </button>

      {/* Sidebar overlay untuk mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300 md:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* Sidebar utama */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-orange-600 to-yellow-500 text-white p-4 z-50 
          transition-all duration-300 ease-in-out shadow-2xl flex flex-col ${
            isMobile
              ? open
                ? "translate-x-0 w-64"
                : "-translate-x-full w-64"
              : collapsed
              ? "w-20"
              : "w-64"
          }`}
      >
        {/* Logo/Header Sidebar - Padding top ditambah untuk mobile */}
        <div className="flex items-center justify-between mb-10 pt-8 md:pt-2">
          <div className="flex items-center gap-3">
            {(!collapsed) ? (
              <>
                {storeLogo && !logoError ? (
                  <div className="bg-white p-1 rounded-lg shadow-md">
                    <img
                      src={storeLogo}
                      alt="Store Logo"
                      className="h-8 w-8 object-contain"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                ) : (
                  <div className="bg-white p-2 rounded-lg shadow-md">
                    <ShoppingCart className="w-6 h-6 text-orange-700" />
                  </div>
                )}
                <h2 className="text-xl font-bold tracking-wide">Kasir App</h2>
              </>
            ) : (
              <div className="bg-white p-2 rounded-lg shadow-md">
                <ShoppingCart className="w-6 h-6 text-orange-700" />
              </div>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-full hover:bg-white/20 transition"
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          )}
        </div>

        {/* Menu Navigasi */}
        <nav className="flex flex-col gap-2 flex-1">
          {menu.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-white text-orange-800 font-semibold shadow-md"
                    : "hover:bg-white/30"
                }`
              }
              onClick={() => isMobile && setOpen(false)}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer Sidebar */}
        {!collapsed && (
          <div className="text-center text-gray-300 text-xs">
            Versi 1.0.0
          </div>
        )}
      </aside>
    </>
  );
}

// ================= TopNav =================
function TopNav() {
  const [userOpen, setUserOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth(); // Ambil data user dari AuthContext
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout(); // Panggil fungsi logout dari AuthContext
      navigate('/login'); // Redirect ke halaman login
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Ambil nama pengguna dari data user atau gunakan default
  const userName = user?.nama_lengkap || user?.username || 'Kasir';
  const userEmail = user?.username ? `${user.username}@example.com` : 'kasir@example.com';

  return (
    <nav className="bg-white shadow-sm px-4 py-3 flex justify-between items-center sticky top-0 z-30 border-b border-gray-200">
      <h1 className="text-xl font-bold text-gray-800 flex-1 text-center md:text-left">
        Dashboard Kasir
      </h1>

      <div className="flex items-center gap-4">
        

        <div className="relative" ref={dropdownRef}>
          <button
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
            onClick={() => setUserOpen(!userOpen)}
          >
            <div className="bg-gradient-to-r from-orange-500 to-yellow-500 p-1 rounded-full">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{userName}</p>
              <p className="text-xs text-gray-500">{userEmail}</p>
            </div>
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-medium text-gray-800">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="block w-full text-left px-4 py-3 hover:bg-red-50 text-sm flex items-center gap-2 text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ================= Footer =================
function Footer() {
  return (
    <footer className="bg-white text-gray-600 text-center py-3 border-t border-gray-200">
      <p className="text-sm">
        &copy; {new Date().getFullYear()} SMK Dashboard. All rights reserved.
      </p>
    </footer>
  );
}
