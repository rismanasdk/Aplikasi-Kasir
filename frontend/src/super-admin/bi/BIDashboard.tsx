import React, { useState, lazy, Suspense } from 'react';
import { Skeleton } from './components/SharedComponents';

// Lazy load semua panel agar tidak load sekaligus
const RingkasanBisnis = lazy(() => import('./components/RingkasanBisnis'));
const CashflowAnalysis = lazy(() => import('./components/CashflowAnalysis'));

const TABS = [
  { id: 'ringkasan', label: 'Ringkasan Bisnis' },
  { id: 'cashflow', label: 'Cash Flow' },
  { id: 'keuangan', label: 'Keuangan' },
  { id: 'produk', label: 'Produk' },
  { id: 'persediaan', label: 'Persediaan' },
  { id: 'forecast', label: 'Forecast' },
] as const;

type TabId = typeof TABS[number]['id'];

const PanelMap: Record<TabId, React.LazyExoticComponent<React.ComponentType>> = {
  ringkasan: RingkasanBisnis,
  cashflow: CashflowAnalysis,
  keuangan: lazy(() => import('./components/KeuanganAnalysis')),
  produk: lazy(() => import('./components/ProdukAnalysis')),
  persediaan: lazy(() => import('./components/PersediaanAnalysis')),
  forecast: lazy(() => import('./components/ForecastAnalysis')),
};

const BIDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('ringkasan');

  const ActivePanel = PanelMap[activeTab];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Business Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">Analisis otomatis berbasis data transaksi, cash flow, dan operasional.</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 -mx-6 px-6 overflow-x-auto">
        <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm border border-gray-100 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel Content */}
      <Suspense fallback={<Skeleton rows={8} />}>
        <ActivePanel />
      </Suspense>
    </div>
  );
};

export default BIDashboard;