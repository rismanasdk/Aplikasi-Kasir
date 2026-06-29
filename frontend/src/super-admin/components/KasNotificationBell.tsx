import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, AlertTriangle, CheckCheck, Wallet } from 'lucide-react';
import { useKasNotifications } from './useKasNotifications';

interface KasNotificationBellProps {
  /** Path ke halaman modal utama (kas) untuk navigasi saat item di-klik. */
  modalPath?: string;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const formatRelativeTime = (iso: string): string => {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
};

const KasNotificationBell: React.FC<KasNotificationBellProps> = ({
  modalPath = '/admin/biaya/modalutama',
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    readIds,
    markAsRead,
    markAllAsRead,
  } = useKasNotifications();

  // Tutup panel saat klik di luar atau Escape
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleClickItem = () => {
    markAsRead();
    setOpen(false);
    navigate(modalPath);
  };

  const notif = notifications[0];
  const isUnread = notif ? !readIds.has(notif.id) : false;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi kas"
        aria-expanded={open}
        className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-orange-100 transition-colors rounded-full"
      >
        <Bell size={20} />

        {/* Badge unread */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                       flex items-center justify-center
                       text-[10px] font-bold text-white
                       bg-gradient-to-r from-red-600 to-orange-500
                       rounded-full shadow-md ring-2 ring-white
                       animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-yellow-50">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-orange-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Notifikasi Kas
              </h3>
              {unreadCount > 0 && (
                <span className="text-xs font-medium text-white bg-red-500 rounded-full px-2 py-0.5">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          {/* Action bar */}
          {notif && isUnread && (
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                <CheckCheck size={14} />
                Tandai sudah dibaca
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {!notif ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCheck size={24} className="text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Kas aman
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Saldo kas masih di atas batas peringatan
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                <li>
                  <button
                    onClick={handleClickItem}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-orange-50 transition-colors ${
                      isUnread ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertTriangle size={18} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          Saldo Kas Menipis
                        </p>
                        {isUnread && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Saldo saat ini:{' '}
                        <span className="font-semibold text-red-600">
                          {formatRupiah(notif.saldo)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Batas peringatan:{' '}
                        <span className="font-medium text-gray-700">
                          {formatRupiah(notif.kasWarning)}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Perlu Perhatian
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {formatRelativeTime(notif.updatedAt)}
                      </p>
                    </div>
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => {
                setOpen(false);
                navigate(modalPath);
              }}
              className="w-full text-center text-xs font-medium text-gray-600 hover:text-orange-600 py-1"
            >
              Lihat detail kas →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KasNotificationBell;
