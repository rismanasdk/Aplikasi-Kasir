import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  AlertTriangle,
  PackageX,
  CheckCheck,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useStockNotifications } from './useStockNotifications';
import { useKasNotifications } from './useKasNotifications';
import { useLiabilitasNotifications } from './useLiabilitasNotifications';

interface UnifiedNotificationBellProps {
  productsPath?: string;
  modalPath?: string;
  liabilitasPath?: string;
}

interface UnifiedItem {
  source: 'stok' | 'kas' | 'liabilitas';
  id: string;
  title: string;
  subtitle?: string;
  badge: string;
  badgeColor: 'red' | 'orange';
  meta?: string;
  isUnread: boolean;
  updatedAt: string;
  onClick: () => void;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

const formatRelativeTime = (iso: string): string => {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID');
};

const UnifiedNotificationBell: React.FC<UnifiedNotificationBellProps> = ({
  productsPath = '/super-admin/products',
  modalPath = '/super-admin/modal-utama',
  liabilitasPath = '/super-admin/liabilitas',
}) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();

  const stock = useStockNotifications();
  const kas = useKasNotifications();
  const liab = useLiabilitasNotifications();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
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

  const items: UnifiedItem[] = useMemo(() => {
    const result: UnifiedItem[] = [];

    // 1. Stok
    if (stock.notifications.length > 0) {
      const total = stock.notifications.length;
      const hasOut = stock.notifications.some(n => n.type === 'out');
      const latestUpdated = stock.notifications.reduce((latest, n) => {
        const t = new Date(n.updatedAt).getTime();
        return t > latest ? t : latest;
      }, 0);

      result.push({
        source: 'stok',
        id: 'stok-summary',
        title: `${total} Produk Hampir Habis`,
        subtitle: `${total} produk memiliki stok di bawah batas minimum.`,
        badge: hasOut ? 'Ada yang Habis' : 'Stok Menipis',
        badgeColor: hasOut ? 'red' : 'orange',
        isUnread: stock.unreadCount > 0,
        updatedAt: new Date(latestUpdated).toISOString(),
        onClick: () => {
          stock.markAllAsRead();
          setOpen(false);
          navigate(`${productsPath}?filter=low-stock`);
        },
      });
    }

    // 2. Kas
    kas.notifications.forEach((n) => {
      result.push({
        source: 'kas',
        id: `kas-${n.id}`,
        title: 'Saldo Kas Menipis',
        subtitle: 'Perlu perhatian segera',
        badge: 'Perlu Perhatian',
        badgeColor: 'red',
        meta: `Saldo ${formatRupiah(n.saldo)} / ${formatRupiah(n.kasWarning)}`,
        isUnread: !kas.readIds.has(n.id),
        updatedAt: n.updatedAt,
        onClick: () => {
          kas.markAsRead();
          setOpen(false);
          navigate(modalPath);
        },
      });
    });

    // 3. Liabilitas
    if (liab.notifications.length > 0) {
      const todayCount = liab.notifications.filter(n => n.type === 'today').length;
      const tomorrowCount = liab.notifications.filter(n => n.type === 'tomorrow').length;
      const totalAmount = liab.notifications.reduce((sum, n) => sum + n.sisa_jumlah, 0);
      const hasToday = todayCount > 0;

      let subtitle = '';
      if (todayCount > 0 && tomorrowCount > 0) {
        subtitle = `${todayCount} jatuh tempo hari ini, ${tomorrowCount} besok.`;
      } else if (todayCount > 0) {
        subtitle = `${todayCount} utang jatuh tempo hari ini.`;
      } else if (tomorrowCount > 0) {
        subtitle = `${tomorrowCount} utang jatuh tempo besok.`;
      }

      const latestUpdated = liab.notifications.reduce((latest, n) => {
        const t = new Date(n.updatedAt || Date.now()).getTime();
        return t > latest ? t : latest;
      }, 0);

      result.push({
        source: 'liabilitas',
        id: 'liabilitas-summary',
        title: `${liab.notifications.length} Utang Jatuh Tempo`,
        subtitle,
        badge: hasToday ? 'Jatuh Tempo Hari Ini' : 'Jatuh Tempo Besok',
        badgeColor: hasToday ? 'red' : 'orange',
        meta: `Total ${formatRupiah(totalAmount)}`,
        isUnread: liab.unreadCount > 0,
        updatedAt: new Date(latestUpdated).toISOString(),
        onClick: () => {
          liab.markAllAsRead();
          setOpen(false);
          navigate(liabilitasPath);
        },
      });
    }

    // Sort: unread dulu, lalu terbaru
    return result.sort((a, b) => {
      if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [stock, kas, liab, navigate, productsPath, modalPath, liabilitasPath]);

  const totalUnread = stock.unreadCount + kas.unreadCount + liab.unreadCount;

  const handleMarkAllAsRead = () => {
    stock.markAllAsRead();
    kas.markAllAsRead();
    liab.markAllAsRead();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        aria-expanded={open}
        className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 hover:bg-orange-100 transition-colors rounded-full"
      >
        <Bell size={20} />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-r from-red-600 to-orange-500 rounded-full shadow-md ring-2 ring-white animate-pulse">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay khusus mobile, biar bisa tap-outside-to-close & fokus ke panel */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            className="fixed inset-x-4 top-16 z-50 max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl
                       sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 sm:max-h-[32rem]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-yellow-50">
              <div className="flex items-center gap-2 min-w-0">
                <Bell size={16} className="text-orange-600 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-800 truncate">Notifikasi</h3>
                {totalUnread > 0 && (
                  <span className="shrink-0 text-xs font-medium text-white bg-red-500 rounded-full px-2 py-0.5">
                    {totalUnread} baru
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Action bar */}
            {totalUnread > 0 && (
              <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700"
                >
                  <CheckCheck size={14} />
                  Tandai semua dibaca
                </button>
              </div>
            )}

            {/* List */}
            <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCheck size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Semua aman</p>
                  <p className="text-xs text-gray-500 mt-1">Tidak ada notifikasi</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const isRed = item.badgeColor === 'red';
                    const isStok = item.source === 'stok';
                    const isLiabilitas = item.source === 'liabilitas';

                    return (
                      <li key={item.id}>
                        <button
                          onClick={item.onClick}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-orange-50 transition-colors ${
                            item.isUnread ? 'bg-orange-50/40' : ''
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                              isRed ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                            }`}
                          >
                            {isStok ? (
                              <PackageX size={18} />
                            ) : isLiabilitas ? (
                              <Clock size={18} />
                            ) : (
                              <AlertTriangle size={18} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {item.title}
                              </p>
                              {item.isUnread && (
                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500" />
                              )}
                            </div>

                            {item.subtitle && (
                              <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                            )}

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  isRed ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                              {item.meta && (
                                <span className="text-xs text-gray-600">{item.meta}</span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-1.5">
                              <p className="text-[11px] text-gray-400">
                                {formatRelativeTime(item.updatedAt)}
                              </p>
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-orange-600 hover:text-orange-700">
                                Lihat Detail <ArrowRight size={11} />
                              </span>
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UnifiedNotificationBell;